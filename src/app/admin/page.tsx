import Link from 'next/link';
import { repo } from '@/lib/repo';
import { getLocality } from '@/lib/geo';
import { PUBLICATION_LABEL, QUALITY_LABEL, STATUS_LABEL } from '@/lib/labels';
import { formatDate } from '@/lib/format';
import type { PublicationState } from '@/lib/types';
import { findDuplicates } from '@/lib/dedupe';

type SP = Promise<{ pub?: string; flag?: string }>;

export default async function AdminHome({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const all = await repo().listProjects({ includeUnpublished: true });
  const pub = sp.pub as PublicationState | undefined;
  const rows = all
    .filter((p) => !pub || p.publication === pub)
    .filter((p) => sp.flag !== '1' || p.status.flaggedForReview || p.dataQuality === 'has_conflicts' || p.sources.some((s) => s.state !== 'ok'))
    .sort((a, b) => a.name.localeCompare(b.name));
  const counts = all.reduce<Record<string, number>>((a, p) => ((a[p.publication] = (a[p.publication] ?? 0) + 1), a), {});
  const dupPairs = new Set<string>();
  for (const p of all) for (const d of findDuplicates(p, all)) dupPairs.add([p.id, d.existing.id].sort().join('|'));

  return (
    <>
      <h1 className="admin-h1">Projects</h1>
      <ul className="admin-filters">
        <li><Link className={`chip ${!pub && !sp.flag ? 'is-active' : ''}`} href="/admin">All ({all.length})</Link></li>
        {(['published', 'needs_review', 'draft', 'archived'] as const).map((s) => (
          <li key={s}>
            <Link className={`chip ${pub === s ? 'is-active' : ''}`} href={`/admin?pub=${s}`}>
              {PUBLICATION_LABEL[s]} ({counts[s] ?? 0})
            </Link>
          </li>
        ))}
        <li><Link className={`chip ${sp.flag === '1' ? 'is-active' : ''}`} href="/admin?flag=1">Flagged / conflicts / stale sources</Link></li>
      </ul>
      {dupPairs.size > 0 && (
        <p className="notice notice-warn small">
          {dupPairs.size} possible duplicate pair{dupPairs.size > 1 ? 's' : ''} detected. <Link href="/admin/merge">Review in Merge duplicates</Link>.
        </p>
      )}
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Project</th>
              <th>Locality</th>
              <th>Status</th>
              <th>Publication</th>
              <th>Quality</th>
              <th>Sources</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id}>
                <td>
                  <Link href={`/admin/projects/${encodeURIComponent(p.id)}`}><strong>{p.name}</strong></Link>
                  <div className="tiny muted">{p.developer.value}</div>
                </td>
                <td>{getLocality(p.localityId.value)?.name ?? p.localityId.value}{p.localityId.provenance === 'inferred' ? ' (inferred)' : ''}</td>
                <td>{STATUS_LABEL[p.status.value]}{p.status.flaggedForReview ? ' ⚑' : ''}</td>
                <td>{PUBLICATION_LABEL[p.publication]}</td>
                <td>{QUALITY_LABEL[p.dataQuality].label}</td>
                <td className="small">
                  {p.sources.map((s) => (
                    <div key={s.id}>{s.kind}{s.state !== 'ok' ? ` — ${s.state}` : ''}</div>
                  ))}
                </td>
                <td className="small">{formatDate(p.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && <p className="muted">No projects match.</p>}
    </>
  );
}
