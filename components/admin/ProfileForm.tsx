'use client';

import { useState } from 'react';

export default function ProfileForm({ email, role }: { email: string; role: string }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; err?: boolean } | null>(null);

  function flash(msg: string, err = false) {
    setToast({ msg, err });
    setTimeout(() => setToast(null), 3000);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (next.length < 8) return flash('New password must be at least 8 characters', true);
    if (next !== confirm) return flash('New passwords do not match', true);
    setSaving(true);
    try {
      const res = await fetch('/api/admin/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ current, next }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error?.message || 'Failed');
      flash('Password updated');
      setCurrent(''); setNext(''); setConfirm('');
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Failed', true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="adm-panel">
        <div className="adm-panel-head"><h3>Account</h3></div>
        <div className="adm-grid2">
          <div className="adm-field"><label>Email</label><input value={email} disabled /></div>
          <div className="adm-field"><label>Role</label><input value={role === 'admin' ? 'Super admin (full access)' : role} disabled /></div>
        </div>
      </div>

      <form className="adm-panel" onSubmit={submit}>
        <div className="adm-panel-head"><h3>Change password</h3></div>
        <div className="adm-field"><label>Current password</label><input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" required /></div>
        <div className="adm-grid2">
          <div className="adm-field"><label>New password</label><input type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" minLength={8} required /></div>
          <div className="adm-field"><label>Confirm new password</label><input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required /></div>
        </div>
        <div className="adm-actions"><button className="adm-btn primary" disabled={saving}><i className="fas fa-key" /> {saving ? 'Saving…' : 'Update password'}</button></div>
      </form>

      {toast && <div className={`adm-toast show${toast.err ? ' err' : ''}`}><i className={`fas ${toast.err ? 'fa-triangle-exclamation' : 'fa-circle-check'}`} />{toast.msg}</div>}
    </>
  );
}
