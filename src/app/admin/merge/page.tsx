import { repo } from '@/lib/repo';
import { findDuplicates } from '@/lib/dedupe';
import { MergeForm } from './MergeForm';

export default async function MergePage() {
  const all = await repo().listProjects({ includeUnpublished: true });
  const pairs: { a: string; b: string; aName: string; bName: string; reason: string; strength: string }[] = [];
  const seen = new Set<string>();
  for (const p of all) {
    for (const d of findDuplicates(p, all)) {
      const key = [p.id, d.existing.id].sort().join('|');
      if (seen.has(key)) continue;
      seen.add(key);
      pairs.push({ a: p.id, b: d.existing.id, aName: p.name, bName: d.existing.name, reason: d.reason, strength: d.strength });
    }
  }
  return (
    <>
      <h1 className="admin-h1">Merge duplicates</h1>
      <p className="small muted" style={{ maxWidth: '75ch' }}>
        Merging keeps the primary record, unions sources and media, preserves any differing values from the secondary record as
        conflicts for review, sets the result to <em>needs review</em>, and archives the secondary record.
      </p>
      <h2 className="h3">Detected</h2>
      {pairs.length === 0 ? <p className="muted small">No likely duplicates detected.</p> : (
        <ul className="small">
          {pairs.map((x) => (
            <li key={x.a + x.b}><strong>{x.aName}</strong> ↔ <strong>{x.bName}</strong> — {x.reason} ({x.strength})</li>
          ))}
        </ul>
      )}
      <h2 className="h3">Merge two records</h2>
      <MergeForm projects={all.map((p) => ({ id: p.id, name: `${p.name} — ${p.developer.value} (${p.publication})` })).sort((a, b) => a.name.localeCompare(b.name))} />
    </>
  );
}
