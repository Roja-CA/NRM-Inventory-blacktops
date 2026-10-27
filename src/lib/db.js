/**
 * Simple JSON-file database.
 * All data lives in <project-root>/data/db.json.
 * On first run the file is created and seeded with one admin + one employee.
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

function ensureDb() {
  if (existsSync(DB_PATH)) return readDb();

  mkdirSync(DATA_DIR, { recursive: true });

  const adminHash = bcrypt.hashSync('Admin@123', 12);
  const empHash   = bcrypt.hashSync('Employee@123', 12);

  const db = {
    users: [
      {
        id: 1,
        name: 'Owner Admin',
        email: 'admin@nrminventory.com',
        password_hash: adminHash,
        role: 'admin',
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: 2,
        name: 'Sample Employee',
        email: 'employee@nrminventory.com',
        password_hash: empHash,
        role: 'employee',
        is_active: true,
        created_at: new Date().toISOString(),
      },
    ],
    nextId: 3,
  };

  writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
  return db;
}

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
