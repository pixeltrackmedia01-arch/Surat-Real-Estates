import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ExternalLink } from 'lucide-react';
import { publishedProjects, repo } from '@/lib/repo';
import { getLocality, getZone } from '@/lib/geo';
import { formatArea, formatDate, formatMonth, formatPrice } from '@/lib/format';
import { GEO_CONFIDENCE_LABEL, PROVENANCE_LABEL, STATUS_LABEL } from '@/lib/labels';
import { relatedProjects } from '@/lib/search';
import type { Field, MediaAsset, Project } from '@/lib/types';
import { Prov, QualityBadge, StatusBadge } from '@/components/Badges';
import { CompareToggle, EnquireButton } from '@/components/ProjectActions';
import { ProjectCard, projectRef } from '@/components/ProjectCard';
import { ReportIssue } from '@/components/ReportIssue';
import { ModelViewer } from '@/components/ModelViewer';
import { MapView } from '@/components/MapView';

export const revalidate = 300;

type Params = Promise<{ slug: string }>;

export async function generateStaticParams() {
  return (await publishedProjects()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const p = await repo().getProjectBySlug((await params).slug);
  if (!p) return { title: 'Project not found' };
  const loc = getLocality(p.localityId.value);
  return {
    title: `${p.name}, ${loc?.name ?? 'Surat'}`,
    description: `${p.name} by ${p.developer.value} in ${loc?.name ?? 'Surat'}. ${STATUS_LABEL[p.status.value]}. Sources and last-checked dates shown.`,
  };
}

const granted = (m: MediaAsset) => m.permission === 'granted';

function FactRow({ label, field, children }: { label: string; field?: Field<unknown>; children: React.ReactNode }) {
  return (
    <div className="fact">
      <dt>{label}</dt>
      <dd>
        <span>{children}</span>
        {field && <Prov field={field} />}
        {field?.note && <span className="fact__note tiny muted">{field.note}</span>}
        {field?.conflict && (
          <span className="fact__note tiny">
            <strong>Sources disagree:</strong>{' '}
            {field.conflict.values.map((v, i) => (
              <span key={i}>
                {i > 0 && ' vs '}
                {typeof v.value === 'string' && v.value in STATUS_LABEL ? STATUS_LABEL[v.value as Project['status']['value']] : String(v.value)}
                {v.note ? ` (${v.note})` : ''}
              </span>
            ))}
          </span>
        )}
      </dd>
    </div>
  );
}

export default async function ProjectPage({ params }: { params: Params }) {
  const { slug } = await params;
  const p = await repo().getProjectBySlug(slug);
  if (!p) notFound();
  const all = await publishedProjects();
  const loc = getLocality(p.localityId.value);
  const zone = getZone(loc?.zoneId);
  const ref = projectRef(p);
  const price = formatPrice(p.price.value);
  const photos = p.media.filter((m) => m.type === 'image' && granted(m));
  const plans = p.media.filter((m) => m.type === 'floor_plan' && granted(m));
  const model = p.media.find((m) => m.type === 'model3d' && granted(m) && /\.(glb|gltf)(\?|$)/i.test(m.url));
  const related = relatedProjects(all, p);
  const primarySource = p.sources[0];
  const lastChecked = p.sources.map((s) => s.checkedAt).sort().at(-1);
  const pendingMedia = p.media.filter((m) => !granted(m)).length;

  return (
    <article className="detail">
      <div className="container">
        <nav aria-label="Breadcrumb" className="crumbs small">
          <ol>
            <li><Link href="/projects">Projects</Link></li>
            {zone && <li><Link href={`/zones/${zone.id}`}>{zone.name}</Link></li>}
            {loc && <li><Link href={`/projects?loc=${loc.id}`}>{loc.name}</Link></li>}
            <li aria-current="page">{p.name}</li>
          </ol>
        </nav>

        <header className="detail-head">
          <div className="detail-head__badges">
            <StatusBadge status={p.status} />
            <QualityBadge quality={p.dataQuality} />
            <span className="badge badge-line">Last checked {formatDate(lastChecked)}</span>
          </div>
          <h1 className="detail-head__title">{p.name}</h1>
          <p className="detail-head__sub">
            by <strong>{p.developer.value}</strong>
            <span aria-hidden="true"> · </span>
            {loc ? <Link href={`/projects?loc=${loc.id}`}>{loc.name}</Link> : 'Locality not set'}
            {zone && <span className="muted">, {zone.name}</span>}
          </p>
          {p.dataQuality !== 'source_checked' && (
            <p className="notice small detail-head__notice">
              Details below come from {primarySource?.kind === 'rera_mirror' ? 'a third-party mirror of RERA registration data' : 'the cited sources'} and
              have not been confirmed by the developer. {p.rera ? 'Check the registration number on the official GujRERA portal before relying on it.' : ''}
            </p>
          )}
          <div className="detail-head__cta">
            <EnquireButton project={ref} intent="visit" className="btn btn-primary" />
            <EnquireButton project={ref} intent="details" className="btn btn-ghost" />
            <CompareToggle project={ref} />
          </div>
        </header>

        <div className="detail-grid">
          <div className="detail-main">
            <section aria-labelledby="facts-h" className="dsec">
              <h2 id="facts-h" className="dsec__title">Key facts</h2>
              <dl className="facts">
                <FactRow label="Status" field={p.status}>{STATUS_LABEL[p.status.value]}</FactRow>
                {p.completionDate && <FactRow label="Proposed completion" field={p.completionDate}>{formatDate(p.completionDate.value)}</FactRow>}
                {p.progress && (
                  <FactRow label="Reported progress" field={p.progress}>
                    {p.progress.value.percent}% <span className="muted">(as of {formatMonth(p.progress.value.asOf)})</span>
                  </FactRow>
                )}
                <FactRow label="RERA registration" field={p.rera}>
                  {p.rera ? (
                    <>
                      <code className="rera">{p.rera.value.number}</code>
                      {p.rera.value.approvedOn && <span className="muted"> · approved {formatDate(p.rera.value.approvedOn)}</span>}
                      {p.rera.value.url && (
                        <>
                          {' '}
                          <a href={p.rera.value.url} target="_blank" rel="noopener noreferrer" className="small">
                            Verify on GujRERA <ExternalLink size={12} aria-hidden="true" style={{ display: 'inline' }} />
                          </a>
                        </>
                      )}
                    </>
                  ) : (
                    <span className="muted">Not provided</span>
                  )}
                </FactRow>
                <FactRow label="Developer / promoter" field={p.developer}>{p.developer.value}</FactRow>
                {p.unitsTotal && <FactRow label="Homes in project" field={p.unitsTotal}>{p.unitsTotal.value}</FactRow>}
                {p.blocks && <FactRow label="Blocks / towers" field={p.blocks}>{p.blocks.value}</FactRow>}
              </dl>
            </section>

            <section aria-labelledby="homes-h" className="dsec">
              <h2 id="homes-h" className="dsec__title">Homes, price &amp; area</h2>
              <dl className="facts">
                <FactRow label="Configurations" field={p.configurations}>
                  {p.configurations.value.length ? p.configurations.value.join(', ') : <span className="muted">Not provided</span>}
                </FactRow>
                <FactRow label={p.price.value.kind === 'starting' ? 'Starting price' : 'Price'} field={p.price}>
                  <span className={p.price.value.kind === 'not_provided' ? 'muted' : ''}>{price.text}</span>
                  {price.qualifier && <span className="muted small"> · {price.qualifier}</span>}
                  {(p.price.value.kind === 'starting' || p.price.value.kind === 'range') && (
                    <span className="fact__note tiny muted">
                      {PROVENANCE_LABEL[p.price.provenance]} asking price, last checked {formatDate(p.price.checkedAt)}. Not a transaction price; availability not guaranteed.
                    </span>
                  )}
                </FactRow>
                <FactRow label="Area" field={p.areas}>
                  {p.areas.value.length ? (
                    <ul className="plain">
                      {p.areas.value.map((a, i) => (
                        <li key={i}>{formatArea(a)}</li>
                      ))}
                    </ul>
                  ) : (
                    <span className="muted">Not provided</span>
                  )}
                </FactRow>
              </dl>
            </section>

            {(photos.length > 0 || plans.length > 0 || model) && (
              <section aria-labelledby="media-h" className="dsec">
                <h2 id="media-h" className="dsec__title">Photos, plans &amp; 3D</h2>
                {photos.length > 0 && (
                  <div className="gallery">
                    {photos.map((m) => (
                      <figure key={m.id}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={m.url} alt={m.alt} loading="lazy" decoding="async" />
                        <figcaption className="tiny muted">
                          {m.illustrative && <span className="badge badge-warn">Artist’s impression</span>} {m.caption} · {m.attribution}
                        </figcaption>
                      </figure>
                    ))}
                  </div>
                )}
                {plans.length > 0 && (
                  <>
                    <h3>Floor plans</h3>
                    <div className="gallery gallery--plans">
                      {plans.map((m) => (
                        <figure key={m.id}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={m.url} alt={m.alt} loading="lazy" decoding="async" />
                          <figcaption className="tiny muted">{m.label ?? m.caption} · {m.attribution}</figcaption>
                        </figure>
                      ))}
                    </div>
                  </>
                )}
                {model && <ModelViewer asset={model} fallbackImage={plans[0]?.url ?? photos[0]?.url} />}
              </section>
            )}
            {photos.length === 0 && plans.length === 0 && !model && (
              <section aria-labelledby="media-h" className="dsec">
                <h2 id="media-h" className="dsec__title">Photos, plans &amp; 3D</h2>
                <p className="muted small">
                  No photos, floor plans or 3D models are shown for this project yet. We display developer media only once its
                  permitted use has been recorded{pendingMedia ? ` (${pendingMedia} item${pendingMedia > 1 ? 's' : ''} awaiting permission)` : ''}.
                  Developers can <Link href="/submit">submit approved media</Link>.
                </p>
              </section>
            )}

            {p.amenities && p.amenities.value.length > 0 && (
              <section aria-labelledby="am-h" className="dsec">
                <h2 id="am-h" className="dsec__title">Amenities <Prov field={p.amenities} /></h2>
                <ul className="amenities">
                  {p.amenities.value.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              </section>
            )}

            <section aria-labelledby="loc-h" className="dsec">
              <h2 id="loc-h" className="dsec__title">Location</h2>
              <dl className="facts">
                {p.address && <FactRow label="Address (as registered)" field={p.address}>{p.address.value}</FactRow>}
                <FactRow label="Locality" field={p.localityId}>{loc?.name ?? '—'}</FactRow>
                <div className="fact">
                  <dt>SMC zone</dt>
                  <dd>
                    <span>{zone?.name ?? 'Not established'}</span>
                    {loc && <span className={`prov prov-${loc.zoneConfidence === 'source_indicated' ? 'sourced' : 'inferred'}`}>{GEO_CONFIDENCE_LABEL[loc.zoneConfidence]}</span>}
                  </dd>
                </div>
                <FactRow label="PIN code" field={p.pinCodes}>
                  {p.pinCodes.value.length ? p.pinCodes.value.join(', ') : <span className="muted">Not provided</span>}
                </FactRow>
              </dl>
              {p.coordinates ? (
                <MapView lat={p.coordinates.value.lat} lng={p.coordinates.value.lng} label={p.name} />
              ) : (
                <p className="tiny muted">No map shown: we have not sourced reliable coordinates for this project.</p>
              )}
            </section>

            <section aria-labelledby="src-h" className="dsec">
              <h2 id="src-h" className="dsec__title">Sources &amp; last checked</h2>
              <ul className="sources">
                {p.sources.map((s) => (
                  <li key={s.id}>
                    <div>
                      <strong>{s.name}</strong>
                      <span className={`badge ${s.state === 'ok' ? 'badge-line' : 'badge-warn'}`}>
                        {s.state === 'ok' ? 'Available' : s.state === 'stale' ? 'Stale' : 'Unavailable'}
                      </span>
                    </div>
                    <p className="tiny muted" style={{ margin: '2px 0 0' }}>
                      Checked {formatDate(s.checkedAt)}
                      {s.note ? ` · ${s.note}` : ''}
                    </p>
                    {s.url && (
                      <a className="tiny" href={s.url} target="_blank" rel="noopener noreferrer nofollow">
                        {new URL(s.url).hostname} <ExternalLink size={11} aria-hidden="true" style={{ display: 'inline' }} />
                      </a>
                    )}
                  </li>
                ))}
              </ul>
              <p className="tiny muted">
                Record created {formatDate(p.createdAt)} · updated {formatDate(p.updatedAt)}
                {p.lastReviewedAt ? ` · reviewed ${formatDate(p.lastReviewedAt)}` : ''}. Not confirmed by the developer unless a field is marked
                “Developer-provided”.
              </p>
              <ReportIssue projectId={p.id} projectName={p.name} />
            </section>
          </div>

          <aside className="detail-aside" aria-label="Enquire about this project">
            <div className="enquire-box">
              <p className="eyebrow">Interested?</p>
              <p className="enquire-box__title">{p.name}</p>
              <p className="small muted">{price.text}{p.configurations.value.length ? ` · ${p.configurations.value.join(', ')}` : ''}</p>
              <EnquireButton project={ref} intent="visit" className="btn btn-primary" />
              <EnquireButton project={ref} intent="details" className="btn btn-ghost" />
              <p className="tiny muted" style={{ margin: 0 }}>
                Your enquiry comes to this independent index. It does not reach the developer automatically.
              </p>
            </div>
          </aside>
        </div>
      </div>

      {related.length > 0 && (
        <section className="section section--tint" aria-labelledby="rel-h">
          <div className="container">
            <h2 id="rel-h">Nearby and similar projects</h2>
            <div className="card-grid">
              {related.map((r) => (
                <ProjectCard key={r.id} project={r} />
              ))}
            </div>
          </div>
        </section>
      )}

      <div className="mobile-cta" role="region" aria-label="Quick enquiry">
        <EnquireButton project={ref} intent="visit" className="btn btn-primary" />
      </div>
    </article>
  );
}
