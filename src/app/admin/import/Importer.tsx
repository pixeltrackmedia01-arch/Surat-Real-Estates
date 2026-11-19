'use client';

import { useState } from 'react';

interface Row {
  row: number;
  name: string;
  ok: boolean;
  errors: string[];
  duplicates: { id: string; name: string; reason: string; strength: string }[];
  action: string;
  id?: string;
}

export function Importer() {
  const [text, setText] = useState('');
  const [format, setFormat] = useState<'csv' | 'json'>('csv');
  const [rows, setRows] = useState<Row[] | null>(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [allowDup, setAllowDup] = useState(false);

  async function run(dryRun: boolean) {
    setBusy(true);
    setMsg('');
    let payload: Record<string, unknown> = { action: 'import', format, dryRun, allowDuplicates: allowDup };
    if (format === 'csv') payload.text = text;
    else {
      try {
        payload.data = JSON.parse(text);
      } catch {
        setBusy(false);
        return setMsg('The JSON could not be parsed.');
      }
    }
    const res = await fetch('/api/admin/projects', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setMsg(j.message ?? 'Import failed.');
    setRows(j.results);
    const ok = j.results.filter((r: Row) => r.ok).length;
    setMsg(dryRun ? `Dry run: ${ok} of ${j.results.length} rows valid. Nothing was saved.` : `Imported. ${ok} valid rows processed (rows with certain duplicates ${allowDup ? 'included' : 'held back'}).`);
  }

  return (
    <div>
      <div className="ed-grid">
        <label className="field">Format
          <select className="select" value={format} onChange={(e) => setFormat(e.target.value as 'csv' | 'json')}>
            <option value="csv">CSV</option>
            <option value="json">JSON (array of Project objects)</option>
          </select>
        </label>
        <label className="field">Load file
          <input
            type="file"
            className="input"
            accept=".csv,.json,text/csv,application/json"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              if (f.size > 2 * 1024 * 1024) return setMsg('File is larger than 2 MB — split it.');
              setFormat(f.name.endsWith('.json') ? 'json' : 'csv');
              setText(await f.text());
            }}
          />
        </label>
      </div>
      <label className="field">Data
        <textarea className="textarea code" style={{ minHeight: 220 }} value={text} onChange={(e) => setText(e.target.value)} />
      </label>
      <label className="check small" style={{ marginBottom: 12 }}>
        <input type="checkbox" checked={allowDup} onChange={(e) => setAllowDup(e.target.checked)} /> Allow rows that match an existing RERA number (they will overwrite only if the id matches)
      </label>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn btn-ghost btn-sm" disabled={busy || !text} onClick={() => run(true)}>Dry run</button>
        <button className="btn btn-ink btn-sm" disabled={busy || !text || !rows} onClick={() => run(false)} title={!rows ? 'Run a dry run first' : undefined}>Import</button>
      </div>
      <p role="status" aria-live="polite" className="small" style={{ marginTop: 12 }}>{msg}</p>
      {rows && (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Row</th><th>Name</th><th>Result</th><th>Duplicates</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.row}>
                  <td>{r.row}</td>
                  <td>{r.name}<div className="tiny muted">{r.id}</div></td>
                  <td>{r.ok ? <span className="badge badge-ok">{r.action}</span> : <ul className="small field-error">{r.errors.map((e) => <li key={e}>{e}</li>)}</ul>}</td>
                  <td className="small">{r.duplicates.length ? r.duplicates.map((d) => <div key={d.id}><span className={`badge ${d.strength === 'certain' ? 'badge-warn' : 'badge-info'}`}>{d.strength}</span> {d.name} — {d.reason}</div>) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
