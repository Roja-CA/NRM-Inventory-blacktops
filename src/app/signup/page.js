'use client';

import { useState } from 'react';
import Link from 'next/link';
import styles from './signup.module.css';

export default function SignupPage() {
  const [form, setForm]     = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone]     = useState(false);

  function set(field) {
    return e => {
      setForm(f => ({ ...f, [field]: e.target.value }));
      setErrors(er => ({ ...er, [field]: '' }));
    };
  }

  // Client-side validation (mirrors server)
  function validate() {
    const e = {};
    if (!form.name.trim())                          e.name     = 'Full name is required.';
    if (!form.email.trim())                         e.email    = 'Email address is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email address.';
    const phone = form.phone.replace(/\s/g, '');
    if (!phone)                                     e.phone    = 'Phone number is required.';
    else if (!/^\d{10}$/.test(phone))               e.phone    = 'Phone must be exactly 10 digits.';
    if (!form.password)                             e.password = 'Password is required.';
    else if (form.password.length < 8)              e.password = 'Password must be at least 8 characters.';
    if (form.password !== form.confirmPassword)     e.confirmPassword = 'Passwords do not match.';
    return e;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setBanner('');
    const clientErrors = validate();
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      return;
    }
    setLoading(true);
    try {
      const res  = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (res.status === 429) {
        setBanner(data.error);
      } else if (!res.ok) {
        if (data.errors) setErrors(data.errors);
        else setBanner(data.error || 'Something went wrong. Please try again.');
      } else {
        setDone(true);
      }
    } catch {
      setBanner('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className={styles.page}>
        <div className={styles.successCard}>
          <div className={styles.successIcon}>✅</div>
          <h1 className={styles.successTitle}>Account Created!</h1>
          <p className={styles.successText}>
            Your account has been created.<br />
            The owner will approve it soon.<br />
            You will be able to log in once approved.
          </p>
          <Link href="/login" className={styles.loginLink}>Back to Login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logoWrap}>
          <span className={styles.logoIcon}>🧵</span>
        </div>
        <h1 className={styles.title}>Create Account</h1>
        <p className={styles.subtitle}>Request an employee account</p>

        <form onSubmit={handleSubmit} className={styles.form} noValidate>

          <div className={styles.field}>
            <label htmlFor="name" className={styles.label}>Full name</label>
            <input id="name" type="text" value={form.name} onChange={set('name')}
              className={`${styles.input} ${errors.name ? styles.inputError : ''}`}
              placeholder="Roja Priya" autoComplete="name" disabled={loading} />
            {errors.name && <span className={styles.fieldError}>{errors.name}</span>}
          </div>

          <div className={styles.field}>
            <label htmlFor="email" className={styles.label}>Email address</label>
            <input id="email" type="email" value={form.email} onChange={set('email')}
              className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
              placeholder="you@example.com" autoComplete="email" disabled={loading} />
            {errors.email && <span className={styles.fieldError}>{errors.email}</span>}
          </div>

          <div className={styles.field}>
            <label htmlFor="phone" className={styles.label}>Phone number</label>
            <input id="phone" type="tel" value={form.phone} onChange={set('phone')}
              className={`${styles.input} ${errors.phone ? styles.inputError : ''}`}
              placeholder="9876543210" autoComplete="tel" disabled={loading}
              maxLength={10} inputMode="numeric" />
            {errors.phone && <span className={styles.fieldError}>{errors.phone}</span>}
          </div>

          <div className={styles.field}>
            <label htmlFor="password" className={styles.label}>Password</label>
            <input id="password" type="password" value={form.password} onChange={set('password')}
              className={`${styles.input} ${errors.password ? styles.inputError : ''}`}
              placeholder="At least 8 characters" autoComplete="new-password" disabled={loading} />
            {errors.password && <span className={styles.fieldError}>{errors.password}</span>}
          </div>

          <div className={styles.field}>
            <label htmlFor="confirmPassword" className={styles.label}>Confirm password</label>
            <input id="confirmPassword" type="password" value={form.confirmPassword} onChange={set('confirmPassword')}
              className={`${styles.input} ${errors.confirmPassword ? styles.inputError : ''}`}
              placeholder="Repeat your password" autoComplete="new-password" disabled={loading} />
            {errors.confirmPassword && <span className={styles.fieldError}>{errors.confirmPassword}</span>}
          </div>

          {banner && <div className={styles.errorBox} role="alert">{banner}</div>}

          <button type="submit" disabled={loading} className={styles.submitBtn}>
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p className={styles.footerLink}>
          Already have an account? <Link href="/login">Log in</Link>
        </p>
      </div>
    </div>
  );
}
