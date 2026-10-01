'use client';

import { useState } from 'react';
import './signin.css';

// A real, bookmarkable sign-in page (replaces the old modal). Posts to the same
// /api/auth/login endpoint the modal used, then returns the user to ?next= (an
// internal path only) or the super-admin by default.
function safeNext(): string {
  if (typeof window === 'undefined') return '/s-admin';
  const n = new URLSearchParams(window.location.search).get('next');
  // Only allow same-site absolute paths (block open redirects like //evil.com).
  if (n && /^\/(?!\/)/.test(n)) return n;
  return '/s-admin';
}

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const r = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const b = await r.json().catch(() => ({}));
      if (!r.ok || !b.user) {
        setError((b.error && b.error.message) || 'Invalid login credentials');
        setBusy(false);
        return;
      }
      window.location.href = safeNext();
    } catch {
      setError('Network error — please try again.');
      setBusy(false);
    }
  }

  return (
    <main className="sgn">
      <div className="sgn-card">
        <a className="sgn-brand" href="/" aria-label="Mappingg home">
          <span className="mark" aria-hidden="true" />
          <b>Mappingg<em>.com</em></b>
        </a>
        <h1 className="sgn-title">Sign in</h1>
        <p className="sgn-sub">Access your Mappingg admin dashboard.</p>

        {error ? <div className="sgn-err" role="alert">{error}</div> : null}

        <form onSubmit={onSubmit} noValidate>
          <div className="sgn-field">
            <label htmlFor="sgn-email">Email</label>
            <input
              id="sgn-email" type="email" autoComplete="username" required
              value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div className="sgn-field">
            <label htmlFor="sgn-pw">Password</label>
            <input
              id="sgn-pw" type="password" autoComplete="current-password" required
              value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <button className="sgn-btn" type="submit" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="sgn-foot"><a href="/">← Back to Mappingg</a></p>
      </div>
    </main>
  );
}
