'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AreaValue, Field, MediaAsset, Project, ProvenanceKind, SourceRecord } from '@/lib/types';

const PROV: ProvenanceKind[] = ['sourced', 'developer', 'admin', 'inferred', 'unverified'];
const today = () => new Date().toISOString().slice(0, 10);
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

type Loc = { id: string; name: string };

export function ProjectEditor({ initial, isNew, localities }: { initial: Project; isNew: boolean; localities: Loc[] }) {
  const router = useRouter();
  const [p, setP] = useState<Project>(initial);
  const [json, setJson] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'warn' | 'danger'; text: string; list?: string[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [markReviewed, setMarkReviewed] = useState(true);

  const up = (fn: (d: Project) => void) =>
    setP((cur) => {
      const d = structuredClone(cur);
      fn(d);
      return d;
    });
  const sourceIds = p.sources.map((s) => s.id);

  function provPicker<T>(f: Field<T> | undefined, onChange: (patch: Partial<Field<T>>) => void) {
    if (!f) return null;
    return (
      <div className="prov-picker">
        <select className="select select--sm" value={f.provenance} onChange={(e) => onChange({ provenance: e.target.value as ProvenanceKind })} aria-label="Provenance">
          {PROV.map((x) => <option key={x} value={x}>{x}</option>)}
        </select>
        <select className="select select--sm" value={f.sourceId ?? ''} onChange={(e) => onChange({ sourceId: e.target.value || undefined, checkedAt: today() })} aria-label="Source">
          <option value="">(no source)</option>
          {sourceIds.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <input className="input input--sm" placeholder="Note / conflict detail" value={f.note ?? ''} onChange={(e) => onChange({ note: e.target.value || undefined })} aria-label="Note" />
        <label className="check tiny">
          <input type="checkbox" checked={!!f.flaggedForReview} onChange={(e) => onChange({ flaggedForReview: e.target.checked || undefined })} /> Flag for review
        </label>
      </div>
    );
  }

  async function save() {
    let body = p;
    if (json !== null) {
      try {
        body = JSON.parse(json);
      } catch {
        return setMsg({ tone: 'danger', text: 'Advanced JSON is not valid JSON.' });
      }
    }
    if (isNew && !body.id) body = { ...body, slug: body.slug || slugify(`${body.name}-${body.localityId.value}`), id: `prj-${body.slug || slugify(`${body.name}-${body.localityId.value}`)}` };
    setBusy(true);
    setMsg(null);
    const res = await fetch('/api/admin/projects', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'save', project: body, markReviewed }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setMsg({ tone: 'danger', text: j.message ?? 'Save failed', list: j.errors });
    setP(j.project);
    setJson(null);
    setMsg({
      tone: j.duplicates?.length ? 'warn' : 'ok',
      text: j.duplicates?.length ? 'Saved — but possible duplicates exist:' : 'Saved.',
      list: j.duplicates?.map((d: { name: string; reason: string }) => `${d.name}: ${d.reason}`),
    });
    if (isNew) router.replace(`/admin/projects/${encodeURIComponent(j.project.id)}`);
    router.refresh();
  }

  async function remove() {
    if (!confirm(`Permanently delete “${p.name}”? Consider archiving instead.`)) return;
    const res = await fetch('/api/admin/projects', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'delete', id: p.id }) });
    if (res.ok) router.replace('/admin');
    else setMsg({ tone: 'danger', text: (await res.json().catch(() => ({}))).message ?? 'Delete failed' });
  }

  const setMedia = (i: number, patch: Partial<MediaAsset>) => up((d) => Object.assign(d.media[i], patch));
  const setSource = (i: number, patch: Partial<SourceRecord>) => up((d) => Object.assign(d.sources[i], patch));
  const setArea = (i: number, patch: Partial<AreaValue>) => up((d) => Object.assign(d.areas.value[i], patch));

  return (
    <div className="editor">
      <div className="editor__head">
        <h1 className="admin-h1">{isNew ? 'Add project' : p.name}</h1>
        <div className="editor__actions">
          {!isNew && p.publication === 'published' && <a className="btn btn-ghost btn-sm" href={`/projects/${p.slug}`} target="_blank">View public page</a>}
          <label className="check small"><input type="checkbox" checked={markReviewed} onChange={(e) => setMarkReviewed(e.target.checked)} /> Mark as reviewed now</label>
          <button className="btn btn-ink btn-sm" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
      <div role="status" aria-live="polite">
        {msg && (
          <div className={`notice notice-${msg.tone}`} style={{ marginBottom: 16 }}>
            <strong>{msg.text}</strong>
            {msg.list && <ul className="small">{msg.list.map((x) => <li key={x}>{x}</li>)}</ul>}
          </div>
        )}
      </div>

      {json === null ? (
        <>
          <fieldset className="ed-sec">
            <legend>Publication</legend>
            <div className="ed-grid">
              <label className="field">Publication
                <select className="select" value={p.publication} onChange={(e) => up((d) => { d.publication = e.target.value as Project['publication']; })}>
                  <option value="draft">Draft</option><option value="needs_review">Needs review</option><option value="published">Published</option><option value="archived">Archived</option>
                </select>
              </label>
              <label className="field">Data quality
                <select className="select" value={p.dataQuality} onChange={(e) => up((d) => { d.dataQuality = e.target.value as Project['dataQuality']; })}>
                  <option value="source_checked">Source checked (verified against official source)</option>
                  <option value="third_party_source">Third-party source</option>
                  <option value="has_conflicts">Has conflicts</option>
                  <option value="incomplete">Incomplete</option>
                </select>
              </label>
              <label className="field ed-wide">Review notes (private)
                <textarea className="textarea" value={p.reviewNotes ?? ''} onChange={(e) => up((d) => { d.reviewNotes = e.target.value || undefined; })} />
              </label>
            </div>
          </fieldset>

          <fieldset className="ed-sec">
            <legend>Identity &amp; location</legend>
            <div className="ed-grid">
              <label className="field">Project name<input className="input" value={p.name} onChange={(e) => up((d) => { d.name = e.target.value; })} /></label>
              <label className="field">Slug<input className="input" value={p.slug} placeholder="auto from name + locality" onChange={(e) => up((d) => { d.slug = slugify(e.target.value); })} disabled={!isNew} /></label>
              <div className="field ed-wide">
                <label htmlFor="ed-dev">Developer / promoter</label>
                <input id="ed-dev" className="input" value={p.developer.value} onChange={(e) => up((d) => { d.developer.value = e.target.value; })} />
                {provPicker(p.developer, (x) => up((d) => Object.assign(d.developer, x)))}
              </div>
              <div className="field">
                <label htmlFor="ed-loc">Locality</label>
                <select id="ed-loc" className="select" value={p.localityId.value} onChange={(e) => up((d) => { d.localityId.value = e.target.value; })}>
                  <option value="">Choose…</option>
                  {localities.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
                {provPicker(p.localityId, (x) => up((d) => Object.assign(d.localityId, x)))}
              </div>
              <div className="field">
                <label htmlFor="ed-pin">PIN codes (comma-separated)</label>
                <input id="ed-pin" className="input" value={p.pinCodes.value.join(', ')} onChange={(e) => up((d) => { d.pinCodes.value = e.target.value.split(/[,\s]+/).filter(Boolean); })} />
                {provPicker(p.pinCodes, (x) => up((d) => Object.assign(d.pinCodes, x)))}
              </div>
              <div className="field ed-wide">
                <label htmlFor="ed-addr">Address / sub-locality</label>
                <input id="ed-addr" className="input" value={p.address?.value ?? ''} onChange={(e) => up((d) => { d.address = e.target.value ? { ...(d.address ?? { provenance: 'sourced', sourceId: sourceIds[0], checkedAt: today() }), value: e.target.value } : undefined; })} />
                {provPicker(p.address, (x) => up((d) => d.address && Object.assign(d.address, x)))}
              </div>
              <div className="field">
                <label>Coordinates (only if sourced)</label>
                <div className="range">
                  <input className="input" placeholder="lat" value={p.coordinates?.value.lat ?? ''} onChange={(e) => up((d) => { const lat = Number(e.target.value); d.coordinates = e.target.value ? { ...(d.coordinates ?? { provenance: 'sourced', sourceId: sourceIds[0], checkedAt: today(), value: { lat: 0, lng: 0 } }), value: { lat, lng: d.coordinates?.value.lng ?? 0 } } : undefined; })} />
                  <input className="input" placeholder="lng" value={p.coordinates?.value.lng ?? ''} onChange={(e) => up((d) => { if (d.coordinates) d.coordinates.value.lng = Number(e.target.value); })} />
                </div>
              </div>
            </div>
          </fieldset>

          <fieldset className="ed-sec">
            <legend>Status, RERA &amp; dates</legend>
            <div className="ed-grid">
              <div className="field">
                <label htmlFor="ed-status">Status</label>
                <select id="ed-status" className="select" value={p.status.value} onChange={(e) => up((d) => { d.status.value = e.target.value as Project['status']['value']; })}>
                  <option value="under_construction">Under construction</option><option value="completed">Completed</option><option value="ready_to_move">Ready to move</option><option value="possession_available">Possession available</option><option value="unverified">Unverified</option>
                </select>
                {provPicker(p.status, (x) => up((d) => Object.assign(d.status, x)))}
                {p.status.conflict && <p className="tiny field-error">Has a recorded conflict: {JSON.stringify(p.status.conflict.values.map((v) => v.value))}. Edit in Advanced JSON to resolve.</p>}
              </div>
              <div className="field">
                <label htmlFor="ed-comp">Declared completion / possession date</label>
                <input id="ed-comp" type="date" className="input" value={p.completionDate?.value ?? ''} onChange={(e) => up((d) => { d.completionDate = e.target.value ? { ...(d.completionDate ?? { provenance: 'sourced', sourceId: sourceIds[0], checkedAt: today() }), value: e.target.value } : undefined; })} />
                {provPicker(p.completionDate, (x) => up((d) => d.completionDate && Object.assign(d.completionDate, x)))}
              </div>
              <div className="field">
                <label htmlFor="ed-rera">RERA registration number</label>
                <input id="ed-rera" className="input" value={p.rera?.value.number ?? ''} onChange={(e) => up((d) => { d.rera = e.target.value ? { ...(d.rera ?? { provenance: 'sourced', sourceId: sourceIds[0], checkedAt: today(), value: { number: '', url: 'https://gujrera.gujarat.gov.in/' } }), value: { ...(d.rera?.value ?? { url: 'https://gujrera.gujarat.gov.in/' }), number: e.target.value } } : undefined; })} />
                {provPicker(p.rera, (x) => up((d) => d.rera && Object.assign(d.rera, x)))}
              </div>
              <label className="field">RERA approved on
                <input type="date" className="input" value={p.rera?.value.approvedOn ?? ''} onChange={(e) => up((d) => { if (d.rera) d.rera.value.approvedOn = e.target.value || undefined; })} disabled={!p.rera} />
              </label>
            </div>
          </fieldset>

          <fieldset className="ed-sec">
            <legend>Homes, price &amp; area</legend>
            <div className="ed-grid">
              <div className="field">
                <label htmlFor="ed-cfg">Configurations (comma-separated, e.g. 2 BHK, 3 BHK)</label>
                <input id="ed-cfg" className="input" value={p.configurations.value.join(', ')} onChange={(e) => up((d) => { d.configurations.value = e.target.value.split(',').map((x) => x.trim()).filter(Boolean); })} />
                {provPicker(p.configurations, (x) => up((d) => Object.assign(d.configurations, x)))}
              </div>
              <div className="field">
                <label htmlFor="ed-pk">Price</label>
                <select id="ed-pk" className="select" value={p.price.value.kind} onChange={(e) => up((d) => { d.price.value.kind = e.target.value as Project['price']['value']['kind']; })}>
                  <option value="not_provided">Not provided</option><option value="on_request">Price on request</option><option value="starting">Starting price</option><option value="range">Price range</option>
                </select>
                {(p.price.value.kind === 'starting' || p.price.value.kind === 'range') && (
                  <div className="range">
                    <input className="input" inputMode="numeric" placeholder="min ₹" value={p.price.value.min ?? ''} onChange={(e) => up((d) => { d.price.value.min = Number(e.target.value) || undefined; })} />
                    {p.price.value.kind === 'range' && <input className="input" inputMode="numeric" placeholder="max ₹" value={p.price.value.max ?? ''} onChange={(e) => up((d) => { d.price.value.max = Number(e.target.value) || undefined; })} />}
                    <select className="select" value={p.price.value.unit ?? 'total'} onChange={(e) => up((d) => { d.price.value.unit = e.target.value as 'total' | 'per_sq_ft'; })}><option value="total">total</option><option value="per_sq_ft">per sq ft</option></select>
                  </div>
                )}
                <input className="input input--sm" placeholder="Qualification, e.g. excl. GST & registration" value={p.price.value.qualification ?? ''} onChange={(e) => up((d) => { d.price.value.qualification = e.target.value || undefined; })} />
                {provPicker(p.price, (x) => up((d) => Object.assign(d.price, x)))}
              </div>
              <div className="field ed-wide">
                <label>Areas — each row must state its measurement type</label>
                {p.areas.value.map((a, i) => (
                  <div key={i} className="range">
                    <select className="select" value={a.kind} onChange={(e) => setArea(i, { kind: e.target.value as AreaValue['kind'] })} aria-label="Area type"><option value="carpet">Carpet</option><option value="built_up">Built-up</option><option value="super_built_up">Super built-up</option></select>
                    <input className="input" placeholder="min" value={a.min ?? ''} onChange={(e) => setArea(i, { min: Number(e.target.value) || undefined })} aria-label="Minimum" />
                    <input className="input" placeholder="max" value={a.max ?? ''} onChange={(e) => setArea(i, { max: Number(e.target.value) || undefined })} aria-label="Maximum" />
                    <select className="select" value={a.unit} onChange={(e) => setArea(i, { unit: e.target.value as AreaValue['unit'] })} aria-label="Unit"><option value="sq_ft">sq ft</option><option value="sq_m">sq m</option></select>
                    <input className="input" placeholder="config e.g. 3 BHK" value={a.configuration ?? ''} onChange={(e) => setArea(i, { configuration: e.target.value || undefined })} aria-label="Configuration" />
                    <button type="button" className="linklike small" onClick={() => up((d) => { d.areas.value.splice(i, 1); })}>Remove</button>
                  </div>
                ))}
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => up((d) => { d.areas.value.push({ kind: 'carpet', unit: 'sq_ft' }); })}>Add area row</button>
                {provPicker(p.areas, (x) => up((d) => Object.assign(d.areas, x)))}
              </div>
              <div className="field ed-wide">
                <label htmlFor="ed-am">Amenities (only if sourced; comma-separated)</label>
                <input id="ed-am" className="input" value={p.amenities?.value.join(', ') ?? ''} onChange={(e) => up((d) => { const v = e.target.value.split(',').map((x) => x.trim()).filter(Boolean); d.amenities = v.length ? { ...(d.amenities ?? { provenance: 'sourced', sourceId: sourceIds[0], checkedAt: today() }), value: v } : undefined; })} />
              </div>
            </div>
          </fieldset>

          <fieldset className="ed-sec">
            <legend>Sources</legend>
            <p className="tiny muted">Mark a source stale or unavailable when its page changes or disappears. Fields reference sources by id.</p>
            {p.sources.map((s, i) => (
              <div key={i} className="ed-row">
                <input className="input input--sm" value={s.id} onChange={(e) => setSource(i, { id: e.target.value })} aria-label="Source id" />
                <input className="input input--sm" value={s.name} placeholder="Name" onChange={(e) => setSource(i, { name: e.target.value })} aria-label="Source name" />
                <input className="input input--sm" value={s.url ?? ''} placeholder="https://" onChange={(e) => setSource(i, { url: e.target.value || undefined })} aria-label="URL" />
                <select className="select select--sm" value={s.kind} onChange={(e) => setSource(i, { kind: e.target.value as SourceRecord['kind'] })} aria-label="Kind">
                  <option value="rera">GujRERA (official)</option><option value="rera_mirror">RERA mirror</option><option value="developer">Developer</option><option value="government">Government</option><option value="submission">Submission</option><option value="other">Other</option>
                </select>
                <input type="date" className="input input--sm" value={s.checkedAt} onChange={(e) => setSource(i, { checkedAt: e.target.value })} aria-label="Checked at" />
                <select className="select select--sm" value={s.state} onChange={(e) => setSource(i, { state: e.target.value as SourceRecord['state'] })} aria-label="State">
                  <option value="ok">OK</option><option value="stale">Stale</option><option value="unavailable">Unavailable</option>
                </select>
                <input className="input input--sm" value={s.note ?? ''} placeholder="Note" onChange={(e) => setSource(i, { note: e.target.value || undefined })} aria-label="Note" />
                <button type="button" className="linklike small" onClick={() => up((d) => { d.sources.splice(i, 1); })}>Remove</button>
              </div>
            ))}
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => up((d) => { d.sources.push({ id: `src-${d.sources.length + 1}`, name: '', kind: 'other', checkedAt: today(), state: 'ok' }); })}>Add source</button>
          </fieldset>

          <fieldset className="ed-sec">
            <legend>Media — images, floor plans, 3D</legend>
            <p className="tiny muted">
              Nothing is displayed publicly unless permission is <strong>granted</strong> and the permitted use is recorded. Mark renders and reconstructed
              models as illustrative. 3D: GLB/glTF only, 25 MB maximum, include a static preview image.
            </p>
            {p.media.map((m, i) => (
              <div key={m.id} className="ed-media">
                <select className="select select--sm" value={m.type} onChange={(e) => setMedia(i, { type: e.target.value as MediaAsset['type'] })} aria-label="Type"><option value="image">Image</option><option value="floor_plan">Floor plan</option><option value="model3d">3D model</option></select>
                <input className="input input--sm" placeholder="File URL" value={m.url} onChange={(e) => setMedia(i, { url: e.target.value })} aria-label="URL" />
                {m.type === 'model3d' && <input className="input input--sm" placeholder="Preview image URL" value={m.previewUrl ?? ''} onChange={(e) => setMedia(i, { previewUrl: e.target.value || undefined })} aria-label="Preview URL" />}
                <input className="input input--sm" placeholder="Alt text" value={m.alt} onChange={(e) => setMedia(i, { alt: e.target.value })} aria-label="Alt text" />
                <input className="input input--sm" placeholder={m.type === 'floor_plan' ? 'Label, e.g. 3 BHK Type A' : 'Caption'} value={(m.type === 'floor_plan' ? m.label : m.caption) ?? ''} onChange={(e) => setMedia(i, m.type === 'floor_plan' ? { label: e.target.value } : { caption: e.target.value })} aria-label="Caption" />
                <input className="input input--sm" placeholder="Attribution, e.g. © Developer" value={m.attribution} onChange={(e) => setMedia(i, { attribution: e.target.value })} aria-label="Attribution" />
                <select className="select select--sm" value={m.sourceId} onChange={(e) => setMedia(i, { sourceId: e.target.value })} aria-label="Source">{sourceIds.map((s) => <option key={s}>{s}</option>)}</select>
                <select className="select select--sm" value={m.permission} onChange={(e) => setMedia(i, { permission: e.target.value as MediaAsset['permission'] })} aria-label="Permission">
                  <option value="not_requested">Permission not requested</option><option value="requested">Requested</option><option value="granted">Granted</option><option value="denied">Denied</option>
                </select>
                <input className="input input--sm" placeholder="Permitted use (required when granted)" value={m.permittedUse ?? ''} onChange={(e) => setMedia(i, { permittedUse: e.target.value || undefined })} aria-label="Permitted use" />
                <input className="input input--sm" placeholder="Size in bytes" value={m.bytes ?? ''} onChange={(e) => setMedia(i, { bytes: Number(e.target.value) || undefined })} aria-label="Bytes" />
                <label className="check tiny"><input type="checkbox" checked={!!m.illustrative} onChange={(e) => setMedia(i, { illustrative: e.target.checked })} /> Illustrative</label>
                {m.permission === 'granted' && !m.permittedUse && <span className="field-error tiny">Record the permitted use.</span>}
                <button type="button" className="linklike small" onClick={() => up((d) => { d.media.splice(i, 1); })}>Remove</button>
              </div>
            ))}
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => up((d) => { d.media.push({ id: `m-${Date.now()}`, type: 'image', url: '', alt: '', attribution: '', sourceId: sourceIds[0] ?? '', permission: 'not_requested' }); })}>Add media</button>
          </fieldset>
        </>
      ) : (
        <textarea className="textarea code" style={{ minHeight: 520 }} value={json} onChange={(e) => setJson(e.target.value)} aria-label="Project JSON" />
      )}

      <div className="editor__foot">
        <button type="button" className="linklike small" onClick={() => setJson(json === null ? JSON.stringify(p, null, 2) : null)}>
          {json === null ? 'Edit as JSON (advanced)' : 'Back to form (discard JSON edits)'}
        </button>
        {!isNew && <button type="button" className="linklike small" style={{ color: 'var(--danger)' }} onClick={remove}>Delete permanently</button>}
      </div>
    </div>
  );
}
