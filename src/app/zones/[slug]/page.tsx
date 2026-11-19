import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getGeoSource, getZone, localitiesInZone, zones } from '@/lib/geo';
import { publishedProjects } from '@/lib/repo';
import { ProjectCard } from '@/components/ProjectCard';
import { EmptyState } from '@/components/EmptyState';

export const revalidate = 300;
type Params = Promise<{ slug: string }>;

export function generateStaticParams() {
  return zones.map((z) => ({ slug: z.id }));
}
export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const z = getZone((await params).slug);
  return z ? { title: `${z.name}, Surat — localities and projects` } : {};
}

export default async function ZonePage({ params }: { params: Params }) {
  const z = getZone((await params).slug);
  if (!z) notFound();
  const locs = localitiesInZone(z.id);
  const ids = new Set(locs.map((l) => l.id));
  const projects = (await publishedProjects()).filter((p) => ids.has(p.localityId.value));

  return (
    <div className="container page">
      <nav aria-label="Breadcrumb" className="crumbs small">
        <ol>
          <li><Link href="/localities">Localities</Link></li>
          <li aria-current="page">{z.name}</li>
        </ol>
      </nav>
      <p className="eyebrow">Surat Municipal Corporation</p>
      <h1>{z.name}</h1>
      <p className="muted">
        {z.formerNames.length ? `Older SMC documents call this ${z.formerNames.join(' / ')}. ` : ''}
        {z.officeLocality ? `Zone office: ${z.officeLocality}. ` : ''}
        Sources: {z.sourceIds.map((id) => getGeoSource(id)?.name).filter(Boolean).join('; ')}.
      </p>
      <ul className="loc-pills" aria-label={`Localities in ${z.name}`}>
        {locs.map((l) => (
          <li key={l.id}>
            <Link className="chip" href={`/localities/${l.id}`}>
              {l.name}
              {l.zoneConfidence !== 'source_indicated' && <span className="tiny muted"> (inferred)</span>}
            </Link>
          </li>
        ))}
      </ul>
      <h2 className="mt">Projects in {z.name}</h2>
      {projects.length ? (
        <>
          <div className="card-grid">
            {projects.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
          <p className="small" style={{ marginTop: 16 }}>
            <Link href={`/projects?zone=${z.id}`}>Filter these results</Link>
          </p>
        </>
      ) : (
        <EmptyState
          title={`No listed projects in ${z.name} yet`}
          body="Coverage is growing as sourced records are added. Developers can submit projects for review."
          action={{ href: '/submit', label: 'Submit a project' }}
        />
      )}
    </div>
  );
}
