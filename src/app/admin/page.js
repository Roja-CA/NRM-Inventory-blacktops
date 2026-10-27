'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './admin.module.css';

export default function AdminPage() {
  const [user, setUser]             = useState(null);
  const [loading, setLoading]       = useState(true);
  const [pendingCount, setPending]  = useState(0);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          router.replace('/login');
        } else if (data.role !== 'admin') {
          router.replace('/employee');
        } else {
          setUser(data);
          setLoading(false);
          // Fetch pending sign-up count (non-blocking)
          fetch('/api/admin/signups?status=pending')
            .then(r => r.json())
            .then(d => setPending((d.signups || []).length))
            .catch(() => {});
        }
      })
      .catch(() => router.replace('/login'));
  }, []);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
  }

  if (loading) {
    return <div className={styles.loadingPage}>Loading…</div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <span className={styles.badge}>Owner · Admin</span>

        <div className={styles.avatar}>
          {user.name.charAt(0).toUpperCase()}
        </div>

        <h1 className={styles.welcome}>Welcome, {user.name}!</h1>

        <p className={styles.description}>
          You are logged in as the <strong>Administrator</strong>.<br />
          This is your owner management area.
        </p>

        <p className={styles.email}>{user.email}</p>

        {/* ── Sign-ups quick-link ─────────────────────────── */}
        <Link href="/admin/signups" className={styles.signupsLink}>
          <span className={styles.signupsLeft}>
            <span className={styles.signupsIcon}>📋</span>
            Sign-up Requests
          </span>
          {pendingCount > 0
            ? <span className={styles.pendingBadge}>{pendingCount} pending</span>
            : <span className={styles.signupsArrow}>→</span>
          }
        </Link>

        <button onClick={handleLogout} className={styles.logoutBtn}>
          Logout
        </button>
      </div>
    </div>
  );
}
