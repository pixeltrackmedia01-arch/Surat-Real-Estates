import type { Metadata } from 'next';
import Link from 'next/link';
import { publishedProjects } from '@/lib/repo';
import { getLocality, getZone } from '@/lib/geo';
import { formatArea, formatDate, formatPrice } from '@/lib/format';
import { STATUS_LABEL, PROVENANCE_LABEL } from '@/lib/labels';
import type { Project } from '@/lib/types';
import { EmptyState } from '@/components/EmptyState';
import { EnquireButton } from '@/components/ProjectActions';
import { projectRef } from '@/components/ProjectCard';
import { CompareSync } from '@/components/CompareSync';

export const metadata: Metadata = { title: 'Compare projects', robots: { index: false } };

type SP = Promise<Record<string, string | string[] | undefined>>;

interface Row {
  label: string;
  get: (p: Project) => { text: React.ReactNode; missing?: boolean; prov?: string };
}

const ROWS: Row[] = [
  { label: 'Locality', get: (p) => ({ text: getLocality(p.localityId.value)?.name ?? '—', prov: p.localityId.provenance === 'inferred' ? 'Inferred' : undefined }) },
  { label: 'SMC zone', get: (p) => ({ text: getZone(getLocality(p.localityId.value)?.zoneId)?.name ?? 'Not established', missing: !getLocality(p.localityId.value)?.zoneId }) },
  { label: 'Developer / promoter', get: (p) => ({ text: p.developer.value }) },
  { label: 'Status', get: (p) => ({ text: STATUS_LABEL[p.status.value], prov: p.status.conflict ? 'Sources disagree' : PROVENANCE_LABEL[p.status.provenance] }) },
  { label: 'Proposed completion', get: (p) => (p.completionDate ? { text: formatDate(p.completionDate.value) } : { text: 'Not provided', missing: true }) },
  { label: 'Reported progress', get: (p) => (p.progress ? { text: `${p.progress.value.percent}% (${p.progress.value.asOf})` } : { text: 'Not provided', missing: true }) },
  { label: 'Price', get: (p) => ({ text: formatPrice(p.price.value).text, missing: p.price.value.kind === 'not_provided' }) },
  { label: 'Configurations', get: (p) => (p.configurations.value.length ? { text: p.configurations.value.join(', ') } : { text: 'Not provided', missing: true }) },
  {
    label: 'Area',
    get: (p) =>
      p.areas.value.length
        ? { text: <ul className="plain">{p.areas.value.map((a, i) => <li key={i}>{formatArea(a)}</li>)}</ul> }
        : { text: 'Not provided', missing: true },
  },
  { label: 'Homes in project', get: (p) => (p.unitsTotal ? { text: String(p.unitsTotal.value) } : { text: 'Not provided', missing: true }) },
  { label: 'RERA registration', get: (p) => (p.rera ? { text: <code className="rera">{p.rera.value.number}</code> } : { text: 'Not provided', missing: true }) },
  { label: 'Last checked', get: (p) => ({ text: formatDate(p.sources.map((s) => s.checkedAt).sort().at(-1)) }) },
];

export default async function ComparePage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.ids) ? sp.ids.join(',') : sp.ids ?? '';
  const ids = raw.split(',').filter(Boolean).slice(0, 3);
  const all = await publishedProjects();
  const items = ids.map((id) => all.find((p) => p.id === id)).filter(Boolean) as Project[];

  return (
    <div className="container compare-page">
      <CompareSync ids={items.map((p) => p.id)} refs={items.map(projectRef)} />
      <p className="eyebrow">Side by side</p>
      <h1>Compare projects</h1>
      {items.length < 2 ? (
        <EmptyState
          title={items.length === 1 ? 'Add one more project to compare' : 'Choose projects to compare'}
          body="Use “Compare” on any project card to select up to three projects. Only fields with data are compared; anything missing is labelled."
          action={{ href: '/projects', label: 'Browse projects' }}
        />
      ) : (
        <div className="compare" style={{ ['--cols' as string]: items.length }}>
          <div className="compare__scroller" role="region" aria-label="Comparison table" tabIndex={0}>
            <table className="compare__table">
              <caption className="visually-hidden">Comparison of {items.map((p) => p.name).join(', ')}</caption>
              <thead>
                <tr>
                  <th scope="col" className="compare__corner"><span className="visually-hidden">Field</span></th>
                  {items.map((p) => (
                    <th key={p.id} scope="col">
                      <Link href={`/projects/${p.slug}`} className="compare__name">{p.name}</Link>
                      <Link className="tiny muted compare__remove" href={`/compare?ids=${items.filter((x) => x.id !== p.id).map((x) => x.id).join(',')}`}>
                        Remove<span className="visually-hidden"> {p.name}</span>
                      </Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROWS.map((r) => (
                  <tr key={r.label}>
                    <th scope="row">{r.label}</th>
                    {items.map((p) => {
                      const v = r.get(p);
                      return (
                        <td key={p.id} className={v.missing ? 'muted' : ''}>
                          {v.text}
                          {v.prov && <span className="tiny muted compare__prov">{v.prov}</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                <tr>
                  <th scope="row"><span className="visually-hidden">Enquire</span></th>
                  {items.map((p) => (
                    <td key={p.id}>
                      <EnquireButton project={projectRef(p)} intent="details" className="btn btn-primary btn-sm" label="Enquire" />
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          <p className="tiny muted">“Not provided” means the sources we used do not state this detail. It does not mean the project lacks it.</p>
        </div>
      )}
    </div>
  );
}
