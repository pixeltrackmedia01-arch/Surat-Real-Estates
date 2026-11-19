import Link from 'next/link';
import { MapPin } from 'lucide-react';
import type { Project } from '@/lib/types';
import { getLocality, getZone } from '@/lib/geo';
import { formatDate, formatMonth, formatPrice } from '@/lib/format';
import { StatusBadge } from './Badges';
import { CompareToggle, EnquireButton } from './ProjectActions';

export function projectRef(p: Project) {
  const loc = getLocality(p.localityId.value);
  return { id: p.id, slug: p.slug, name: p.name, locality: loc ? `${loc.name}, Surat` : 'Surat' };
}

export function ProjectCard({ project: p, headingLevel = 3 }: { project: Project; headingLevel?: 2 | 3 }) {
  const loc = getLocality(p.localityId.value);
  const zone = getZone(loc?.zoneId);
  const price = formatPrice(p.price.value);
  const H = `h${headingLevel}` as 'h2' | 'h3';
  const cover = p.media.find((m) => m.type === 'image' && m.permission === 'granted');
  const ref = projectRef(p);

  return (
    <article className="pcard">
      <div className="pcard__visual" aria-hidden={cover ? undefined : true}>
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover.url} alt={cover.alt} loading="lazy" decoding="async" width={640} height={400} />
        ) : (
          <div className="pcard__placeholder weave">
            <span className="pcard__initials">{p.name.split(/\s+/).slice(0, 2).map((w) => w[0]).join('')}</span>
            <span className="tiny">No permitted photos yet</span>
          </div>
        )}
      </div>
      <div className="pcard__body">
        <div className="pcard__meta">
          <StatusBadge status={p.status} />
          {p.status.value === 'under_construction' && p.completionDate && (
            <span className="tiny muted">Proposed completion {formatMonth(p.completionDate.value)}</span>
          )}
        </div>
        <H className="pcard__title">
          <Link href={`/projects/${p.slug}`} className="pcard__link">
            {p.name}
          </Link>
        </H>
        <p className="pcard__dev small">{p.developer.value}</p>
        <p className="pcard__loc small">
          <MapPin size={14} aria-hidden="true" />
          {loc?.name ?? 'Locality not set'}
          {p.localityId.provenance === 'inferred' && <span className="prov prov-inferred">inferred</span>}
          {zone && <span className="muted"> · {zone.name}</span>}
        </p>
        <dl className="pcard__facts">
          <div>
            <dt>Price</dt>
            <dd className={p.price.value.kind === 'not_provided' ? 'muted' : ''}>{price.text}</dd>
          </div>
          <div>
            <dt>Homes</dt>
            <dd className={p.configurations.value.length ? '' : 'muted'}>
              {p.configurations.value.length ? p.configurations.value.join(', ') : 'Not provided'}
            </dd>
          </div>
        </dl>
        <p className="tiny muted pcard__checked">Last checked {formatDate(p.sources[0]?.checkedAt)}</p>
        <div className="pcard__actions">
          <EnquireButton project={ref} intent="details" className="btn btn-primary btn-sm" label="Enquire" />
          <CompareToggle project={ref} compact />
        </div>
      </div>
    </article>
  );
}
