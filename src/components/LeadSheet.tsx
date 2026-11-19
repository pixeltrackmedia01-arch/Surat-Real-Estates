'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { CalendarDays, Check, X } from 'lucide-react';
import type { ProjectRef } from './Providers';
import { INDIAN_MOBILE } from '@/lib/validation';
import { BUDGET_BANDS } from '@/lib/labels';

type Result =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | { kind: 'sent'; stored: 'supabase' | 'local-dev'; duplicate?: boolean }
  | { kind: 'not_sent'; message: string }
  | { kind: 'error'; message: string };

interface Errors {
  name?: string;
  mobile?: string;
  preferredDate?: string;
  consent?: string;
}

const today = () => new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10);
const newKey = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);

export function LeadSheet({
  open,
  project,
  intent,
  onClose,
}: {
  open: boolean;
  project: ProjectRef | null;
  intent: 'visit' | 'details';
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const path = usePathname();
  const uid = useId();
  const [errors, setErrors] = useState<Errors>({});
  const [result, setResult] = useState<Result>({ kind: 'idle' });
  const [key, setKey] = useState(newKey);
  const [startedAt, setStartedAt] = useState(Date.now());
  const sending = result.kind === 'sending';

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      setResult({ kind: 'idle' });
      setErrors({});
      setKey(newKey());
      setStartedAt(Date.now());
    } else if (!open && d.open) d.close();
  }, [open]);

  function validate(fd: FormData): Errors {
    const e: Errors = {};
    const name = String(fd.get('name') ?? '').trim();
    const mobile = String(fd.get('mobile') ?? '').replace(/[\s-]/g, '');
    const date = String(fd.get('preferredDate') ?? '');
    if (name.length < 2) e.name = 'Please enter your name.';
    if (!INDIAN_MOBILE.test(mobile)) e.mobile = 'Enter a 10-digit Indian mobile number, e.g. 98XXXXXX10.';
    if (date && date < today()) e.preferredDate = 'Choose today or a later date.';
    if (!fd.get('consent')) e.consent = 'Please confirm you agree to be contacted about this enquiry.';
    return e;
  }

  async function onSubmit(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    if (sending) return;
    const fd = new FormData(ev.currentTarget);
    const e = validate(fd);
    setErrors(e);
    if (Object.keys(e).length) {
      const first = Object.keys(e)[0];
      formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }
    setResult({ kind: 'sending' });
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          projectId: project?.id ?? null,
          sourcePath: path,
          name: fd.get('name'),
          mobile: fd.get('mobile'),
          budget: fd.get('budget') || '',
          visitPreference: fd.get('visitPreference') || undefined,
          preferredDate: fd.get('preferredDate') || undefined,
          message: fd.get('message') || '',
          consent: fd.get('consent') === 'on',
          idempotencyKey: key,
          website: fd.get('website') || '',
          startedAt,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && (json.stored === 'supabase' || json.stored === 'local-dev')) {
        setResult({ kind: 'sent', stored: json.stored, duplicate: json.duplicate });
      } else if (res.status === 503) {
        setResult({ kind: 'not_sent', message: json.message ?? 'Enquiries cannot be received right now.' });
      } else if (res.status === 400 && json.fieldErrors) {
        setErrors(json.fieldErrors);
        setResult({ kind: 'idle' });
      } else {
        setResult({ kind: 'error', message: json.message ?? 'Something went wrong. Your enquiry was not sent.' });
      }
    } catch {
      setResult({ kind: 'error', message: 'Network error. Your enquiry was not sent — please try again.' });
    }
  }

  const title = intent === 'visit' ? 'Schedule a site visit' : 'Request details';
  const errId = (k: keyof Errors) => (errors[k] ? `${uid}-${k}-err` : undefined);

  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-labelledby={`${uid}-title`}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="sheet__panel">
        <div className="sheet__head">
          <div>
            <p className="eyebrow" style={{ marginBottom: 4 }}>
              {project ? 'Enquiry for' : 'General enquiry'}
            </p>
            <h2 id={`${uid}-title`} className="sheet__title">
              {project ? project.name : title}
            </h2>
            {project?.locality && <p className="small muted" style={{ margin: 0 }}>{project.locality}</p>}
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close enquiry form">
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div role="status" aria-live="polite" className="sheet__status">
          {result.kind === 'sent' && result.stored === 'supabase' && (
            <div className="notice notice-ok">
              <p style={{ margin: 0, fontWeight: 600 }}>
                <Check size={16} aria-hidden="true" style={{ display: 'inline', verticalAlign: '-3px' }} /> Enquiry received.
              </p>
              <p className="small" style={{ margin: '4px 0 0' }}>
                {result.duplicate ? 'We already had this enquiry — it was not submitted twice. ' : ''}
                It has been saved for our team. We are an independent index, so this does not mean the developer has been
                contacted yet.
              </p>
            </div>
          )}
          {result.kind === 'sent' && result.stored === 'local-dev' && (
            <div className="notice notice-warn">
              <p style={{ margin: 0, fontWeight: 600 }}>Development mode: stored locally, not sent.</p>
              <p className="small" style={{ margin: '4px 0 0' }}>
                This enquiry was written to <code>.data/leads.local.json</code> on this machine only. No one has been notified.
              </p>
            </div>
          )}
          {(result.kind === 'not_sent' || result.kind === 'error') && (
            <div className="notice notice-danger">
              <p style={{ margin: 0, fontWeight: 600 }}>Your enquiry was not sent.</p>
              <p className="small" style={{ margin: '4px 0 0' }}>{result.message}</p>
            </div>
          )}
        </div>

        {result.kind !== 'sent' && (
          <form
            ref={formRef}
            onSubmit={onSubmit}
            noValidate
            className="sheet__form"
            onChange={(e) => {
              const n = (e.target as unknown as HTMLInputElement).name as keyof Errors;
              if (errors[n]) setErrors((cur) => ({ ...cur, [n]: undefined }));
            }}
          >
            <div className="field">
              <label htmlFor={`${uid}-name`}>Your name</label>
              <input id={`${uid}-name`} name="name" className="input" autoComplete="name" required aria-invalid={!!errors.name} aria-describedby={errId('name')} />
              {errors.name && <span id={errId('name')} className="field-error">{errors.name}</span>}
            </div>
            <div className="field">
              <label htmlFor={`${uid}-mobile`}>Mobile number</label>
              <input
                id={`${uid}-mobile`}
                name="mobile"
                className="input"
                type="tel"
                inputMode="tel"
                autoComplete="tel-national"
                placeholder="10-digit mobile"
                required
                aria-invalid={!!errors.mobile}
                aria-describedby={errId('mobile') ?? `${uid}-mobile-hint`}
              />
              {errors.mobile ? (
                <span id={errId('mobile')} className="field-error">{errors.mobile}</span>
              ) : (
                <span id={`${uid}-mobile-hint`} className="field-hint">Indian numbers only. +91 is optional.</span>
              )}
            </div>
            <div className="sheet__row">
              <div className="field">
                <label htmlFor={`${uid}-budget`}>Budget</label>
                <select id={`${uid}-budget`} name="budget" className="select" defaultValue="">
                  <option value="">Prefer not to say</option>
                  {BUDGET_BANDS.map((b) => (
                    <option key={b.id} value={b.label}>{b.label}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor={`${uid}-pref`}>Visit preference</label>
                <select id={`${uid}-pref`} name="visitPreference" className="select" defaultValue={intent === 'details' ? 'call-first' : 'any'}>
                  <option value="any">Any day</option>
                  <option value="weekday">Weekday</option>
                  <option value="weekend">Weekend</option>
                  <option value="call-first">Call me first</option>
                </select>
              </div>
            </div>
            <div className="field">
              <label htmlFor={`${uid}-date`}>
                <CalendarDays size={15} aria-hidden="true" style={{ display: 'inline', verticalAlign: '-2px' }} /> Preferred date <span className="muted">(optional)</span>
              </label>
              <input id={`${uid}-date`} name="preferredDate" type="date" min={today()} className="input" aria-invalid={!!errors.preferredDate} aria-describedby={errId('preferredDate')} />
              {errors.preferredDate && <span id={errId('preferredDate')} className="field-error">{errors.preferredDate}</span>}
            </div>
            <div className="field">
              <label htmlFor={`${uid}-msg`}>Message <span className="muted">(optional)</span></label>
              <textarea id={`${uid}-msg`} name="message" className="textarea" maxLength={1000} placeholder="Configuration, timing, questions…" />
            </div>
            <div className="hp" aria-hidden="true">
              <label>
                Website <input name="website" tabIndex={-1} autoComplete="off" />
              </label>
            </div>
            <div className="field">
              <label className="check">
                <input type="checkbox" name="consent" aria-invalid={!!errors.consent} aria-describedby={errId('consent')} />
                <span>
                  I agree that this index may store these details and contact me about this enquiry. See the{' '}
                  <a href="/privacy" target="_blank">privacy notice</a>.
                </span>
              </label>
              {errors.consent && <span id={errId('consent')} className="field-error">{errors.consent}</span>}
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={sending} aria-busy={sending}>
              {sending ? 'Sending…' : title}
            </button>
            <p className="tiny muted" style={{ marginTop: 10, marginBottom: 0 }}>
              We are an independent index, not the developer. Availability and prices are not guaranteed.
            </p>
          </form>
        )}
        {result.kind === 'sent' && (
          <button type="button" className="btn btn-ghost" style={{ width: '100%', marginTop: 16 }} onClick={onClose}>
            Close
          </button>
        )}
      </div>
    </dialog>
  );
}
