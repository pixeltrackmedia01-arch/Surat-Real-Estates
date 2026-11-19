import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ExternalLink } from 'lucide-react';
import { getGeoSource, getLocality, getZone, localities } from '@/lib/geo';
import { publishedProjects } from '@/lib/repo';
import { GEO_CONFIDENCE_LABEL } from '@/lib/labels';
import { ProjectCard } from '@/components/ProjectCard';
import { EmptyState } from '@/components/EmptyState';
import postOffices from '@/data/postOffices.json';
import type { PostOffice } from '@/lib/types';

export const revalidate = 300;
type Params = Promise<{ slug: string }>;

export function generateStaticParams() {
  return localities.map((l) => ({ slug: l.id }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const l = getLocality((await params).slug);
  return l ? { title: `${l.name}, Surat — residential projects`, description: `Residential projects and locality details for ${l.name}, Surat.` } : {};
}

export default async function LocalityPage({ params }: { params: Params }) {
  const l = getLocality((await params).slug);
  if (!l) notFound();
  const zone = getZone(l.zoneId);
  const projects = (await publishedProjects()).filter((p) => p.localityId.value === l.id);
  const offices = (postOffices as PostOffice[]).filter((o) => o.localityIds.includes(l.id));
  const sharedPins = (postOffices as PostOffice[]).filter((o) => l.pinCodes.includes(o.pin) && !o.localityIds.includes(l.id));

  return (
    <div className="container page">
      <nav aria-label="Breadcrumb" className="crumbs small">
        <ol>
          <li><Link href="/localities">Localities</Link></li>
          {zone && <li><Link href={`/zones/${zone.id}`}>{zone.name}</Link></li>}
          <li aria-current="page">{l.name}</li>
        </ol>
      </nav>
      <h1>{l.name}</h1>
      {l.aliases.length > 0 && <p className="muted">Also searched as: {l.aliases.join(', ')}</p>}

      <div className="loc-facts">
        <dl className="facts">
          <div className="fact">
            <dt>SMC zone</dt>
            <dd>
              <span>{zone?.name ?? 'Not established'}</span>
              <span className={`prov prov-${l.zoneConfidence === 'source_indicated' ? 'sourced' : 'inferred'}`}>{GEO_CONFIDENCE_LABEL[l.zoneConfidence]}</span>
              {l.zoneEvidence && <span className="fact__note tiny muted">{l.zoneEvidence}</span>}
            </dd>
          </div>
          <div className="fact">
            <dt>Associated PIN codes</dt>
            <dd>
              <span>{l.pinCodes.length ? l.pinCodes.join(', ') : 'Not established'}</span>
              {offices.length > 0 && (
                <span className="fact__note tiny muted">
                  From India Post office{offices.length > 1 ? 's' : ''}: {offices.map((o) => `${o.office} (${o.pin})`).join('; ')}. A PIN code can cover several
                  localities and is not a boundary.
                </span>
              )}
            </dd>
          </div>
          {sharedPins.length > 0 && (
            <div className="fact">
              <dt>Other post offices sharing these PINs</dt>
              <dd>
                <span className="small">{sharedPins.slice(0, 14).map((o) => o.office.replace(/ (B|S|H)\.?O\.?$/, '').replace(/ (BO|SO|HO)( Surat)?$/, '')).join(', ')}{sharedPins.length > 14 ? '…' : ''}</span>
                <span className="fact__note tiny muted">Some of these may lie outside the SMC city limit.</span>
              </dd>
            </div>
          )}
          <div className="fact">
            <dt>Sources</dt>
            <dd>
              <ul className="plain small">
                {l.sourceIds.map((id) => {
                  const s = getGeoSource(id);
                  return s ? (
                    <li key={id}>
                      <a href={s.url} target="_blank" rel="noopener noreferrer">{s.name} <ExternalLink size={11} aria-hidden="true" style={{ display: 'inline' }} /></a>
                      <span className="tiny muted"> · checked {s.checkedAt}{s.pageUpdated ? `, page updated ${s.pageUpdated}` : ''}</span>
                    </li>
                  ) : null;
                })}
                {l.sourceIds.length === 0 && <li className="muted">No direct source — zone placement is inferred.</li>}
              </ul>
            </dd>
          </div>
        </dl>
      </div>

      <h2 className="mt">Projects in {l.name}</h2>
      {projects.length ? (
        <div className="card-grid">
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      ) : (
        <EmptyState
          title={`No listed projects in ${l.name} yet`}
          body="That doesn’t mean there are none — only that we haven’t added a sourced record. Developers can submit projects for review."
          action={{ href: '/submit', label: 'Submit a project' }}
        />
      )}
    </div>
  );
}
