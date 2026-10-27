/**
 * Simple JSON-file database.
 * All data lives in <project-root>/data/db.json.
 * On first run the file is created and seeded with one admin + one employee.
 *
 * User record shape:
 *   id             – number (auto-increment)
 *   name           – string
 *   email          – string (lowercase, unique)
 *   phone          – string (10-digit, '' for seeded accounts)
 *   password_hash  – string (bcrypt, cost 12)
 *   role           – 'admin' | 'employee'
 *   status         – 'active' | 'pending' | 'rejected'
 *   rejection_note – string | null
 *   via_signup     – boolean  (true = came through the signup form)
 *   approved_at    – ISO string | null
 *   rejected_at    – ISO string | null
 *   created_at     – ISO string
 *
 * Default credentials (change after first login):
 *   Admin    – admin@nrminventory.com  / Admin@123
 *   Employee – employee@nrminventory.com / Employee@123
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH  = path.join(DATA_DIR, 'db.json');

function readDb() {
  return JSON.parse(readFileSync(DB_PATH, 'utf8'));
}

function saveDb(db) {
  writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
}

function ensureDb() {
  if (existsSync(DB_PATH)) {
    const db = readDb();

    // ── Migrate records created before the status/phone/via_signup fields ──
    let dirty = false;
    for (const u of db.users) {
      if (u.status === undefined) {
        u.status         = u.is_active ? 'active' : 'inactive';
        u.phone          = u.phone          ?? '';
        u.rejection_note = u.rejection_note ?? null;
        u.via_signup     = u.via_signup     ?? false;
        u.approved_at    = u.approved_at    ?? null;
        u.rejected_at    = u.rejected_at    ?? null;
        dirty = true;
      }
    }
    if (dirty) saveDb(db);
    return db;
  }

  // ── First-run seed ─────────────────────────────────────────────────────
  mkdirSync(DATA_DIR, { recursive: true });

  const adminHash = bcrypt.hashSync('Admin@123',    12);
  const empHash   = bcrypt.hashSync('Employee@123', 12);

  const db = {
    users: [
      {
        id: 1,
        name:           'Owner Admin',
        email:          'admin@nrminventory.com',
        phone:          '',
        password_hash:  adminHash,
        role:           'admin',
        status:         'active',
        rejection_note: null,
        via_signup:     false,
        approved_at:    null,
        rejected_at:    null,
        created_at:     new Date().toISOString(),
      },
      {
        id: 2,
        name:           'Sample Employee',
        email:          'employee@nrminventory.com',
        phone:          '',
        password_hash:  empHash,
        role:           'employee',
        status:         'active',
        rejection_note: null,
        via_signup:     false,
        approved_at:    null,
        rejected_at:    null,
        created_at:     new Date().toISOString(),
      },
    ],
    nextId: 3,
  };

  saveDb(db);
  return db;
}

// ── Public read helpers ────────────────────────────────────────────────────

/** Find a user by email (case-insensitive). Returns the full record including password_hash. */
export function getUserByEmail(email) {
  const db = ensureDb();
  return db.users.find(u => u.email === email.toLowerCase().trim()) || null;
}

/** Find a user by id. Returns the record WITHOUT password_hash. */
export function getUserById(id) {
  const db = ensureDb();
  const user = db.users.find(u => u.id === id);
  if (!user) return null;
  // eslint-disable-next-line no-unused-vars
  const { password_hash, ...safeUser } = user;
  return safeUser;
}

// ── Signup helpers ─────────────────────────────────────────────────────────

/**
 * Create a new pending user from the signup form.
 * Role is always forced to 'employee' — callers cannot override this.
 * Returns the safe record (no password_hash).
 */
export function createUser({ name, email, phone, passwordHash }) {
  const db = ensureDb();
  const id  = db.nextId++;

  const user = {
    id,
    name:           name.trim(),
    email:          email.toLowerCase().trim(),
    phone:          phone.trim(),
    password_hash:  passwordHash,
    role:           'employee',  // ← enforced; cannot be escalated via this path
    status:         'pending',
    rejection_note: null,
    via_signup:     true,
    approved_at:    null,
    rejected_at:    null,
    created_at:     new Date().toISOString(),
  };

  db.users.push(user);
  saveDb(db);

  // eslint-disable-next-line no-unused-vars
  const { password_hash, ...safeUser } = user;
  return safeUser;
}

// ── Admin approval helpers ─────────────────────────────────────────────────

/**
 * Approve a pending user → status becomes 'active'.
 * Returns the updated safe record, or null if not found.
 */
export function approveUser(id) {
  const db   = ensureDb();
  const user = db.users.find(u => u.id === id);
  if (!user) return null;

  user.status      = 'active';
  user.approved_at = new Date().toISOString();
  saveDb(db);

  // eslint-disable-next-line no-unused-vars
  const { password_hash, ...safeUser } = user;
  return safeUser;
}

/**
 * Reject a pending user → status becomes 'rejected'.
 * Returns the updated safe record, or null if not found.
 */
export function rejectUser(id, note) {
  const db   = ensureDb();
  const user = db.users.find(u => u.id === id);
  if (!user) return null;

  user.status         = 'rejected';
  user.rejection_note = note ? note.trim() : null;
  user.rejected_at    = new Date().toISOString();
  saveDb(db);

  // eslint-disable-next-line no-unused-vars
  const { password_hash, ...safeUser } = user;
  return safeUser;
}

// ── List helpers ───────────────────────────────────────────────────────────

/**
 * Return all signup-originated users (via_signup = true).
 * Optionally filtered by status ('pending' | 'active' | 'rejected').
 * Records are safe (no password_hash), sorted newest first.
 */
export function getSignups(status) {
  const db = ensureDb();
  return db.users
    .filter(u => u.via_signup && (status ? u.status === status : true))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    // eslint-disable-next-line no-unused-vars
    .map(({ password_hash, ...u }) => u);
}

/** Count of signup-originated users still waiting for approval. */
export function getPendingCount() {
  const db = ensureDb();
  return db.users.filter(u => u.via_signup && u.status === 'pending').length;
}
