'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function MergeForm({ projects }: { projects: { id: string; name: string }[] }) {
  const router = useRouter();
  const [msg, setMsg] = useState('');
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        if (!confirm('Merge these records? The secondary record will be archived.')) return;
        const res = await fetch('/api/admin/projects', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ action: 'merge', primaryId: fd.get('a'), secondaryId: fd.get('b') }),
        });
        const j = await res.json().catch(() => ({}));
        if (res.ok) {
          setMsg('Merged. The result is marked “needs review”.');
          router.push(`/admin/projects/${encodeURIComponent(j.project.id)}`);
        } else setMsg(j.message ?? 'Merge failed');
      }}
      className="ed-grid"
    >
      <label className="field">Primary (kept)
        <select name="a" className="select" required>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
      </label>
      <label className="field">Secondary (archived)
        <select name="b" className="select" required>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
      </label>
      <div><button className="btn btn-ink btn-sm">Merge</button></div>
      <p role="status" className="small">{msg}</p>
    </form>
  );
}
