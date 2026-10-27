'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './signups.module.css';

const TABS = ['pending', 'active', 'rejected'];
const TAB_LABEL = { pending: 'Pending', active: 'Approved', rejected: 'Rejected' };

function fmt(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function SignupsPage() {
  const router = useRouter();
  const [tab, setTab]             = useState('pending');
  const [data, setData]           = useState({ pending: null, active: null, rejected: null });
  const [busy, setBusy]           = useState({});
  const [rejectOpen, setRejectOpen] = useState({}); // id -> note string | undefined
  const [error, setError]         = useState('');

  const load = useCallback(async (status) => {
    try {
      const res = await fetch(`/api/admin/signups?status=${status}`);
      if (res.status === 403) { router.replace('/admin'); return; }
      const json = await res.json();
      setData(d => ({ ...d, [status]: json.signups || [] }));
    } catch {
      setError('Failed to load sign-ups. Please refresh.');
    }
  }, [router]);

  // Verify admin and load pending on mount
  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      if (d.error || d.role !== 'admin') { router.replace('/login'); return; }
      load('pending');
    }).catch(() => router.replace('/login'));
  }, [load, router]);

  // Load a tab's data lazily
  useEffect(() => {
    if (data[tab] === null) load(tab);
  }, [tab, data, load]);

  async function handleApprove(id) {
    setBusy(b => ({ ...b, [id]: true }));
    try {
      const res = await fetch(`/api/admin/signups/${id}/approve`, { method: 'POST' });
      if (!res.ok) throw new Error();
      // Refresh pending and active lists
      setData(d => ({ ...d, pending: null, active: null }));
      load('pending');
    } catch {
      setError('Could not approve. Please try again.');
    } finally {
      setBusy(b => ({ ...b, [id]: false }));
    }
  }

  async function handleReject(id) {
    const note = rejectOpen[id] || '';
    setBusy(b => ({ ...b, [id]: true }));
    try {
      const res = await fetch(`/api/admin/signups/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note }),
      });
      if (!res.ok) throw new Error();
      setRejectOpen(r => { const n = { ...r }; delete n[id]; return n; });
      setData(d => ({ ...d, pending: null, rejected: null }));
      load('pending');
    } catch {
      setError('Could not reject. Please try again.');
    } finally {
      setBusy(b => ({ ...b, [id]: false }));
    }
  }

  const list = data[tab];
  const pendingCount = (data.pending || []).length;

  return (
    <div className={styles.page}>
      <div className={styles.inner}>

        {/* Top bar */}
        <div className={styles.topBar}>
          <Link href="/admin" className={styles.backBtn}>← Dashboard</Link>
          <h1 className={styles.pageTitle}>Sign-up Requests</h1>
        </div>

        <div className={styles.card}>
          {/* Tabs */}
          <div className={styles.tabs}>
            {TABS.map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`${styles.tab} ${tab === t ? styles.tabActive : ''}`}>
                {TAB_LABEL[t]}
                {t === 'pending' && pendingCount > 0 && (
                  <span className={styles.badge}>{pendingCount}</span>
                )}
              </button>
            ))}
          </div>

          <div className={styles.content}>
            {error && <p style={{ color: '#dc2626', marginBottom: 16, fontSize: 14 }}>{error}</p>}

            {/* Loading */}
            {list === null && (
              <div className={styles.emptyState}>Loading…</div>
            )}

            {/* Empty */}
            {list !== null && list.length === 0 && (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>
                  {tab === 'pending' ? '🕐' : tab === 'active' ? '✅' : '❌'}
                </div>
                No {TAB_LABEL[tab].toLowerCase()} sign-ups yet.
              </div>
            )}

            {/* Table */}
            {list !== null && list.length > 0 && (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>{tab === 'pending' ? 'Signed up' : tab === 'active' ? 'Approved' : 'Rejected'}</th>
                    {tab === 'pending' && <th>Action</th>}
                    {tab !== 'pending' && <th>Details</th>}
                  </tr>
                </thead>
                <tbody>
                  {list.map(u => (
                    <tr key={u.id}>
                      <td className={styles.name}>{u.name}</td>
                      <td>{u.email}</td>
                      <td>{u.phone || '—'}</td>
                      <td className={styles.muted}>
                        {tab === 'pending'  && fmt(u.created_at)}
                        {tab === 'active'   && fmt(u.approved_at)}
                        {tab === 'rejected' && fmt(u.rejected_at)}
                      </td>
                      {tab === 'pending' && (
                        <td>
                          <div className={styles.actions}>
                            <button className={styles.approveBtn}
                              disabled={busy[u.id]}
                              onClick={() => handleApprove(u.id)}>
                              {busy[u.id] ? '…' : 'Approve'}
                            </button>

                            {rejectOpen[u.id] === undefined ? (
                              <button className={styles.rejectBtn}
                                disabled={busy[u.id]}
                                onClick={() => setRejectOpen(r => ({ ...r, [u.id]: '' }))}>
                                Reject
                              </button>
                            ) : (
                              <div className={styles.rejectForm}>
                                <textarea
                                  className={styles.rejectNote}
                                  placeholder="Optional note for your records…"
                                  value={rejectOpen[u.id]}
                                  onChange={e => setRejectOpen(r => ({ ...r, [u.id]: e.target.value }))}
                                />
                                <div className={styles.rejectNoteRow}>
                                  <button className={styles.confirmRejectBtn}
                                    disabled={busy[u.id]}
                                    onClick={() => handleReject(u.id)}>
                                    {busy[u.id] ? '…' : 'Confirm Reject'}
                                  </button>
                                  <button className={styles.cancelBtn}
                                    onClick={() => setRejectOpen(r => { const n={...r}; delete n[u.id]; return n; })}>
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      )}
                      {tab === 'active' && (
                        <td>
                          <span className={`${styles.pill} ${styles.pillActive}`}>Approved</span>
                        </td>
                      )}
                      {tab === 'rejected' && (
                        <td>
                          <span className={`${styles.pill} ${styles.pillRejected}`}>Rejected</span>
                          {u.rejection_note && <p className={styles.note}>"{u.rejection_note}"</p>}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
