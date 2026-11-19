'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export function LoginForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setErr('');
        const fd = new FormData(e.currentTarget);
        const res = await fetch('/api/admin/login', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ password: fd.get('password') }),
        });
        setBusy(false);
        if (res.ok) {
          const next = sp.get('next');
          router.replace(next && next.startsWith('/admin') ? next : '/admin');
          router.refresh();
        } else setErr((await res.json().catch(() => ({}))).message ?? 'Sign in failed');
      }}
    >
      <div className="field">
        <label htmlFor="pw">Password</label>
        <input id="pw" name="password" type="password" className="input" autoComplete="current-password" required aria-invalid={!!err} aria-describedby={err ? 'pw-err' : undefined} />
        {err && <span id="pw-err" role="alert" className="field-error">{err}</span>}
      </div>
      <button className="btn btn-ink" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
    </form>
  );
}
