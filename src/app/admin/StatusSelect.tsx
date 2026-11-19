'use client';

import { useState } from 'react';

export function StatusSelect({ kind, id, value, options }: { kind: 'lead' | 'correction'; id: string; value: string; options: string[] }) {
  const [v, setV] = useState(value);
  const [err, setErr] = useState('');
  return (
    <>
      <select
        className="select select--sm"
        value={v}
        aria-label="Status"
        onChange={async (e) => {
          const next = e.target.value;
          const prev = v;
          setV(next);
          const res = await fetch('/api/admin/inbox', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind, id, status: next }) });
          if (!res.ok) {
            setV(prev);
            setErr('Not saved');
          } else setErr('');
        }}
      >
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      {err && <span className="tiny field-error"> {err}</span>}
    </>
  );
}
