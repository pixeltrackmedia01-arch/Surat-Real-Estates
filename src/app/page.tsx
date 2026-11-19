import Link from 'next/link';
import { ArrowRight, FileSearch, Layers, ShieldQuestion } from 'lucide-react';
import { SearchBox } from '@/components/SearchBox';
import { ProjectCard } from '@/components/ProjectCard';
import { publishedProjects } from '@/lib/repo';
import { localities, localitiesInZone, zones } from '@/lib/geo';
import { BHK_OPTIONS, BUDGET_BANDS } from '@/lib/labels';

export const revalidate = 300;

const FEATURED_LOCALITIES = ['vesu', 'althan', 'pal', 'citylight', 'varachha', 'katargam', 'udhna', 'adajan'];

export default async function Home() {
  const projects = await publishedProjects();
  const recent = [...projects].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 6);
  const countByZone = new Map<string, number>();
  const countByLoc = new Map<string, number>();
  for (const p of projects) {
    countByLoc.set(p.localityId.value, (countByLoc.get(p.localityId.value) ?? 0) + 1);
    const z = localities.find((l) => l.id === p.localityId.value)?.zoneId;
    if (z) countByZone.set(z, (countByZone.get(z) ?? 0) + 1);
  }
  const featured = FEATURED_LOCALITIES.map((id) => localities.find((l) => l.id === id)!).filter(Boolean);

  return (
    <>
      <section className="hero">
        <div className="hero__weave weave" aria-hidden="true" />
        <div className="container hero__inner">
          <p className="eyebrow">Surat · Residential projects · Under construction &amp; completed</p>
          <h1 className="hero__title">
            Find a new home in Surat, <em>with the sources shown</em>.
          </h1>
          <p className="lede">
            Search residential projects across all nine Surat Municipal Corporation zones by locality, PIN code, budget,
            BHK and status. Each record shows where its facts came from and when they were last checked.
          </p>
          <SearchBox />
          <div className="quick">
            <div className="quick__group" aria-label="Popular localities">
              <span className="quick__label">Locality</span>
              {featured.map((l) => (
                <Link key={l.id} className="chip" href={`/projects?loc=${l.id}`}>
                  {l.name}
                </Link>
              ))}
            </div>
            <div className="quick__group" aria-label="Homes by BHK">
              <span className="quick__label">BHK</span>
              {BHK_OPTIONS.slice(1, 5).map((b) => (
                <Link key={b} className="chip" href={`/projects?bhk=${encodeURIComponent(b)}`}>
                  {b}
                </Link>
              ))}
            </div>
            <div className="quick__group" aria-label="Budget">
              <span className="quick__label">Budget</span>
              {BUDGET_BANDS.slice(0, 4).map((b) => (
                <Link key={b.id} className="chip" href={`/projects?budget=${b.id}`}>
                  {b.label}
                </Link>
              ))}
            </div>
            <div className="quick__group" aria-label="Status">
              <span className="quick__label">Status</span>
              <Link className="chip" href="/projects?status=under_construction">Under construction</Link>
              <Link className="chip" href="/projects?possession=ready">Completed / ready</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="section zones-section" aria-labelledby="zones-h">
        <div className="container">
          <div className="section-head">
            <div>
              <p className="eyebrow">Browse the city</p>
              <h2 id="zones-h">Nine SMC zones, {localities.length} localities</h2>
              <p className="muted" style={{ maxWidth: '62ch' }}>
                Zones follow the current Surat Municipal Corporation structure. A locality is placed in a zone only where an
                SMC document names it there; other placements are marked as inferred.
              </p>
            </div>
            <Link href="/localities" className="btn btn-ghost">
              All localities <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
          <ol className="zone-grid">
            {zones.map((z, i) => {
              const locs = localitiesInZone(z.id);
              const n = countByZone.get(z.id) ?? 0;
              return (
                <li key={z.id} className="zone-tile">
                  <span className="zone-tile__num" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                  <h3 className="zone-tile__name">
                    <Link href={`/zones/${z.id}`}>{z.name}</Link>
                  </h3>
                  {z.formerNames[0] && <p className="tiny muted" style={{ margin: 0 }}>formerly {z.formerNames[0]}</p>}
                  <p className="small zone-tile__locs">
                    {locs.slice(0, 5).map((l) => l.name).join(' · ')}
                    {locs.length > 5 ? ` +${locs.length - 5}` : ''}
                  </p>
                  <p className="tiny zone-tile__count">{n ? `${n} listed project${n === 1 ? '' : 's'}` : 'No listed projects yet'}</p>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {recent.length > 0 && (
        <section className="section section--tint" aria-labelledby="recent-h">
          <div className="container">
            <div className="section-head">
              <div>
                <p className="eyebrow">Recently updated</p>
                <h2 id="recent-h">Latest records in the index</h2>
              </div>
              <Link href="/projects?sort=updated" className="btn btn-ghost">
                View all {projects.length} <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
            <div className="card-grid">
              {recent.map((p) => (
                <ProjectCard key={p.id} project={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="section" aria-labelledby="how-h">
        <div className="container method">
          <div>
            <p className="eyebrow">How to read a listing</p>
            <h2 id="how-h">Facts, with their origins attached</h2>
            <p className="muted">
              We would rather show “Not provided” than a guess. Every important field carries one of these labels.
            </p>
            <Link href="/methodology" className="linklike">Read the full methodology</Link>
          </div>
          <ul className="method__list">
            <li>
              <FileSearch size={22} aria-hidden="true" />
              <div>
                <h3>Source-reported</h3>
                <p className="small muted">Taken from a cited public record, such as a RERA registration page. We show the source and the date we checked it.</p>
              </div>
            </li>
            <li>
              <Layers size={22} aria-hidden="true" />
              <div>
                <h3>Developer-provided</h3>
                <p className="small muted">Supplied directly by the developer. Photos, plans and 3D models appear only when their permitted use is recorded.</p>
              </div>
            </li>
            <li>
              <ShieldQuestion size={22} aria-hidden="true" />
              <div>
                <h3>Inferred or unverified</h3>
                <p className="small muted">Plausible but not yet confirmed — for example, a locality matched from an address, or a status where sources disagree.</p>
              </div>
            </li>
          </ul>
        </div>
      </section>

      <section className="section cta-band" aria-labelledby="dev-h">
        <div className="container cta-band__inner">
          <div>
            <h2 id="dev-h">Are you a developer, or did you spot an error?</h2>
            <p className="muted" style={{ margin: 0, maxWidth: '58ch' }}>
              Submit a residential project with its RERA registration, or send a correction with evidence. We review
              submissions before publishing and record who supplied each fact.
            </p>
          </div>
          <Link className="btn btn-primary" href="/submit">
            Submit or correct a project
          </Link>
        </div>
      </section>
    </>
  );
}
