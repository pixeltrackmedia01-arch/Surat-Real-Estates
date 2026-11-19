'use client';

import { useState } from 'react';

export function SubmitForm() {
  const [startedAt] = useState(Date.now());
  const [state, setState] = useState<{ kind: 'idle' | 'sending' } | { kind: 'done'; stored: string } | { kind: 'fail'; msg: string }>({ kind: 'idle' });
  const [err, setErr] = useState<Record<string, string>>({});

  return (
    <>
      <div role="status" aria-live="polite">
        {state.kind === 'done' && (
          <p className={`notice ${state.stored === 'local-dev' ? 'notice-warn' : 'notice-ok'}`}>
            {state.stored === 'local-dev' ? 'Development mode: stored locally in .data — not sent.' : 'Thank you — your submission is queued for review.'}
          </p>
        )}
        {state.kind === 'fail' && <p className="notice notice-danger">Not sent: {state.msg}</p>}
      </div>
      {state.kind !== 'done' && (
        <form
          className="submit-form"
          noValidate
          onSubmit={async (e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const kind = String(fd.get('kind'));
            const lines = [
              `Type: ${kind === 'new' ? 'New project submission' : 'Correction'}`,
              `Project: ${fd.get('project')}`,
              fd.get('developer') && `Developer / promoter: ${fd.get('developer')}`,
              fd.get('locality') && `Locality: ${fd.get('locality')}`,
              fd.get('rera') && `GujRERA no.: ${fd.get('rera')}`,
              fd.get('media') && `Media & permission: ${fd.get('media')}`,
              `Details: ${fd.get('details')}`,
            ].filter(Boolean);
            const details = lines.join('\n');
            if (!String(fd.get('project')).trim()) return setErr({ project: 'Please name the project.' });
            if (String(fd.get('details')).trim().length < 10) return setErr({ details: 'Please add at least a sentence of detail.' });
            setErr({});
            setState({ kind: 'sending' });
            const res = await fetch('/api/corrections', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({
                projectId: null,
                sourcePath: '/submit',
                field: kind === 'new' ? 'new_project' : 'correction',
                details,
                evidenceUrl: fd.get('evidence') || '',
                submitterRole: fd.get('role'),
                contact: fd.get('contact') || undefined,
                website: fd.get('website') || '',
                startedAt,
              }),
            });
            const j = await res.json().catch(() => ({}));
            if (res.ok) setState({ kind: 'done', stored: j.stored });
            else if (res.status === 400 && j.fieldErrors) {
              setErr(j.fieldErrors);
              setState({ kind: 'idle' });
            } else setState({ kind: 'fail', msg: j.message ?? 'Please try again later.' });
          }}
        >
          <fieldset className="field fieldset">
            <legend>This is</legend>
            <label className="check"><input type="radio" name="kind" value="new" defaultChecked /> A new project</label>
            <label className="check"><input type="radio" name="kind" value="correction" /> A correction to an existing listing</label>
          </fieldset>
          <div className="field">
            <label htmlFor="s-project">Project name</label>
            <input id="s-project" name="project" className="input" required aria-invalid={!!err.project} aria-describedby={err.project ? 's-project-e' : undefined} />
            {err.project && <span id="s-project-e" className="field-error">{err.project}</span>}
          </div>
          <div className="ed-grid">
            <div className="field"><label htmlFor="s-dev">Developer / promoter</label><input id="s-dev" name="developer" className="input" /></div>
            <div className="field"><label htmlFor="s-loc">Locality</label><input id="s-loc" name="locality" className="input" placeholder="e.g. Vesu" /></div>
            <div className="field"><label htmlFor="s-rera">GujRERA registration no.</label><input id="s-rera" name="rera" className="input" placeholder="PR/GJ/SURAT/…" /></div>
            <div className="field"><label htmlFor="s-ev">Evidence / official link</label><input id="s-ev" name="evidence" type="url" className="input" placeholder="https://" aria-invalid={!!err.evidenceUrl} />{err.evidenceUrl && <span className="field-error">{err.evidenceUrl}</span>}</div>
          </div>
          <div className="field">
            <label htmlFor="s-details">Details</label>
            <textarea id="s-details" name="details" className="textarea" placeholder="Status, configurations, carpet areas, price basis, completion date… or what should be corrected." aria-invalid={!!err.details} aria-describedby={err.details ? 's-details-e' : undefined} />
            {err.details && <span id="s-details-e" className="field-error">{err.details}</span>}
          </div>
          <div className="field">
            <label htmlFor="s-media">Media you can supply, and permitted use <span className="muted">(optional)</span></label>
            <textarea id="s-media" name="media" className="textarea" placeholder="e.g. 6 photos and 3 floor plans; may be displayed on this site with credit “© Developer”." />
          </div>
          <div className="ed-grid">
            <div className="field">
              <label htmlFor="s-role">You are</label>
              <select id="s-role" name="role" className="select" defaultValue="developer"><option value="developer">The developer / promoter</option><option value="visitor">A home seeker</option><option value="other">Other</option></select>
            </div>
            <div className="field"><label htmlFor="s-contact">Your contact (email or phone)</label><input id="s-contact" name="contact" className="input" /></div>
          </div>
          <div className="hp" aria-hidden="true"><input name="website" tabIndex={-1} autoComplete="off" /></div>
          <button className="btn btn-primary" disabled={state.kind === 'sending'}>{state.kind === 'sending' ? 'Sending…' : 'Send for review'}</button>
        </form>
      )}
    </>
  );
}
