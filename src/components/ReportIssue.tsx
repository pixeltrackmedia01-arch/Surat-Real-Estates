'use client';

import { useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Flag, X } from 'lucide-react';

type R = { kind: 'idle' | 'sending' } | { kind: 'done'; stored: string } | { kind: 'fail'; message: string };

export function ReportIssue({ projectId, projectName, variant = 'link' }: { projectId: string | null; projectName?: string; variant?: 'link' | 'button' }) {
  const ref = useRef<HTMLDialogElement>(null);
  const path = usePathname();
  const [r, setR] = useState<R>({ kind: 'idle' });
  const [err, setErr] = useState<Record<string, string>>({});
  const [startedAt, setStartedAt] = useState(Date.now());

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (r.kind === 'sending') return;
    const fd = new FormData(e.currentTarget);
    const details = String(fd.get('details') ?? '').trim();
    if (details.length < 10) return setErr({ details: 'Please describe what is incorrect (at least 10 characters).' });
    setErr({});
    setR({ kind: 'sending' });
    try {
      const res = await fetch('/api/corrections', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          projectId,
          sourcePath: path,
          field: fd.get('field') || undefined,
          details,
          evidenceUrl: fd.get('evidenceUrl') || '',
          submitterRole: fd.get('role') || undefined,
          contact: fd.get('contact') || undefined,
          website: fd.get('website') || '',
          startedAt,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (res.ok) setR({ kind: 'done', stored: j.stored });
      else if (res.status === 400 && j.fieldErrors) {
        setErr(j.fieldErrors);
        setR({ kind: 'idle' });
      } else setR({ kind: 'fail', message: j.message ?? 'Your report was not sent.' });
    } catch {
      setR({ kind: 'fail', message: 'Network error — your report was not sent.' });
    }
  }

  return (
    <>
      <button
        type="button"
        className={variant === 'link' ? 'linklike small report-link' : 'btn btn-ghost btn-sm'}
        onClick={() => {
          setR({ kind: 'idle' });
          setStartedAt(Date.now());
          ref.current?.showModal();
        }}
      >
        <Flag size={14} aria-hidden="true" /> Report an incorrect or outdated detail
      </button>
      <dialog ref={ref} className="sheet" aria-labelledby="ri-title" onClick={(e) => e.target === ref.current && ref.current?.close()}>
        <div className="sheet__panel">
          <div className="sheet__head">
            <div>
              <p className="eyebrow" style={{ marginBottom: 4 }}>Correction</p>
              <h2 id="ri-title" className="sheet__title">{projectName ?? 'Report an issue'}</h2>
            </div>
            <button type="button" className="icon-btn" onClick={() => ref.current?.close()} aria-label="Close">
              <X size={20} aria-hidden="true" />
            </button>
          </div>
          <div role="status" aria-live="polite">
            {r.kind === 'done' && (
              <div className={`notice ${r.stored === 'local-dev' ? 'notice-warn' : 'notice-ok'}`}>
                {r.stored === 'local-dev'
                  ? 'Development mode: stored locally in .data/corrections.local.json — not sent.'
                  : 'Thank you. Your report is queued for review. We will update the record only after checking the evidence.'}
              </div>
            )}
            {r.kind === 'fail' && <div className="notice notice-danger">Not sent: {r.message}</div>}
          </div>
          {r.kind !== 'done' && (
            <form onSubmit={submit} noValidate>
              <div className="field">
                <label htmlFor="ri-field">Which detail?</label>
                <select id="ri-field" name="field" className="select" defaultValue="">
                  <option value="">General / other</option>
                  <option value="status">Status</option>
                  <option value="rera">RERA registration</option>
                  <option value="completionDate">Completion / possession date</option>
                  <option value="price">Price</option>
                  <option value="configurations">Configurations (BHK)</option>
                  <option value="areas">Area</option>
                  <option value="locality">Locality / address</option>
                  <option value="developer">Developer / promoter</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="ri-details">What is incorrect?</label>
                <textarea id="ri-details" name="details" className="textarea" required aria-invalid={!!err.details} aria-describedby={err.details ? 'ri-details-err' : undefined} />
                {err.details && <span id="ri-details-err" className="field-error">{err.details}</span>}
              </div>
              <div className="field">
                <label htmlFor="ri-url">Evidence link <span className="muted">(optional)</span></label>
                <input id="ri-url" name="evidenceUrl" type="url" className="input" placeholder="https://" aria-invalid={!!err.evidenceUrl} />
                {err.evidenceUrl && <span className="field-error">{err.evidenceUrl}</span>}
              </div>
              <div className="sheet__row">
                <div className="field">
                  <label htmlFor="ri-role">You are</label>
                  <select id="ri-role" name="role" className="select" defaultValue="visitor">
                    <option value="visitor">A home seeker / visitor</option>
                    <option value="developer">The developer / promoter</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="ri-contact">Contact <span className="muted">(optional)</span></label>
                  <input id="ri-contact" name="contact" className="input" autoComplete="email" />
                </div>
              </div>
              <div className="hp" aria-hidden="true">
                <input name="website" tabIndex={-1} autoComplete="off" />
              </div>
              <button className="btn btn-ink" style={{ width: '100%' }} disabled={r.kind === 'sending'}>
                {r.kind === 'sending' ? 'Sending…' : 'Send report'}
              </button>
            </form>
          )}
        </div>
      </dialog>
    </>
  );
}
