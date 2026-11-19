import type { Metadata } from 'next';
import Link from 'next/link';
import { localities, localitiesInZone, zones } from '@/lib/geo';
import { publishedProjects } from '@/lib/repo';
import { GEO_CONFIDENCE_LABEL } from '@/lib/labels';

export const metadata: Metadata = {
  title: 'Surat localities by SMC zone',
  description: 'Browse Surat localities grouped by the nine Surat Municipal Corporation zones, with associated PIN codes and the evidence for each placement.',
};
export const revalidate = 300;

export default async function LocalitiesPage() {
  const projects = await publishedProjects();
  const count = new Map<string, number>();
  for (const p of projects) count.set(p.localityId.value, (count.get(p.localityId.value) ?? 0) + 1);
  const unzoned = localities.filter((l) => !l.zoneId);

  return (
    <div className="container page">
      <p className="eyebrow">Browse</p>
      <h1>Localities &amp; zones</h1>
      <p className="lede">
        {localities.length} localities across the nine current SMC zones. This is a browsing aid, not a boundary map — we do
        not draw zone or locality boundaries because we have not found a free, authoritative boundary file.
      </p>
      <div className="legend small">
        <span><span className="dot dot--sourced" aria-hidden="true" /> {GEO_CONFIDENCE_LABEL.source_indicated}</span>
        <span><span className="dot dot--inferred" aria-hidden="true" /> {GEO_CONFIDENCE_LABEL.inferred}</span>
        <Link href="/methodology#localities">How zones and PIN codes are assigned</Link>
      </div>

      <div className="zone-columns">
        {zones.map((z) => {
          const locs = localitiesInZone(z.id);
          return (
            <section key={z.id} className="zone-col" aria-labelledby={`z-${z.id}`}>
              <h2 id={`z-${z.id}`} className="zone-col__title">
                <Link href={`/zones/${z.id}`}>{z.name}</Link>
              </h2>
              {z.formerNames.length > 0 && <p className="tiny muted">Also seen as: {z.formerNames.join(', ')}</p>}
              <ul className="loc-list">
                {locs.map((l) => (
                  <li key={l.id}>
                    <span className={`dot dot--${l.zoneConfidence === 'source_indicated' ? 'sourced' : 'inferred'}`} aria-hidden="true" />
                    <Link href={`/localities/${l.id}`}>{l.name}</Link>
                    <span className="visually-hidden"> ({GEO_CONFIDENCE_LABEL[l.zoneConfidence]})</span>
                    {l.pinCodes.length > 0 && <span className="tiny muted"> {l.pinCodes.join(', ')}</span>}
                    {count.get(l.id) ? <span className="badge badge-ink loc-count">{count.get(l.id)}</span> : null}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
        {unzoned.length > 0 && (
          <section className="zone-col" aria-labelledby="z-none">
            <h2 id="z-none" className="zone-col__title">Zone not established</h2>
            <ul className="loc-list">
              {unzoned.map((l) => (
                <li key={l.id}>
                  <span className="dot" aria-hidden="true" />
                  <Link href={`/localities/${l.id}`}>{l.name}</Link>
                  {l.pinCodes.length > 0 && <span className="tiny muted"> {l.pinCodes.join(', ')}</span>}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
