'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './admin.module.css';

export default function AdminPage() {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          router.replace('/login');
        } else {
          setUser(data);
          setLoading(false);
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

        <button onClick={handleLogout} className={styles.logoutBtn}>
          Logout
        </button>
      </div>
    </div>
  );
}
