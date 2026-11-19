import type { Project } from './types';
import { editDistance, normalise } from './geo';

const STOP = /(developers?|builders?|group|realty|infra|llp|pvt|private|limited|ltd|associates|and|&)/g;
const devKey = (s: string) => normalise(s.toLowerCase().replace(STOP, ''));
const reraKey = (s?: string) => (s ? normalise(s).replace(/(a1r|ex\d)\w*/g, '') : '');

export interface DuplicateMatch {
  existing: Project;
  reason: string;
  strength: 'certain' | 'likely';
}

/**
 * Duplicate detection: same RERA registration (ignoring amendment/extension suffixes) is certain;
 * same normalised name + locality with similar developer is likely.
 */
export function findDuplicates(candidate: Project, all: Project[]): DuplicateMatch[] {
  const out: DuplicateMatch[] = [];
  const cRera = reraKey(candidate.rera?.value.number);
  const cName = normalise(candidate.name);
  const cDev = devKey(candidate.developer.value);
  for (const p of all) {
    if (p.id === candidate.id) continue;
    const pRera = reraKey(p.rera?.value.number);
    if (cRera && pRera && (cRera === pRera || cRera.startsWith(pRera) || pRera.startsWith(cRera))) {
      out.push({ existing: p, reason: 'Same RERA registration number', strength: 'certain' });
      continue;
    }
    const sameName = cName === normalise(p.name) || editDistance(cName, normalise(p.name), 2) <= 1;
    const sameLoc = candidate.localityId.value === p.localityId.value;
    const pDev = devKey(p.developer.value);
    const similarDev = !cDev || !pDev || cDev.includes(pDev) || pDev.includes(cDev) || editDistance(cDev, pDev, 3) <= 2;
    if (sameName && sameLoc && similarDev) {
      out.push({ existing: p, reason: 'Same name, locality and similar developer', strength: 'likely' });
    } else if (sameName && sameLoc) {
      out.push({ existing: p, reason: 'Same name and locality (different developer name)', strength: 'likely' });
    }
  }
  return out;
}

/**
 * Manual merge: the admin chooses which record survives; source records are unioned, media
 * unioned by URL, and for each field the primary value is kept while a differing secondary
 * value is preserved as a conflict for review rather than silently dropped.
 */
export function mergeProjects(primary: Project, secondary: Project, now = new Date().toISOString()): Project {
  const merged: Project = structuredClone(primary);
  const keys = ['developer', 'localityId', 'address', 'status', 'completionDate', 'price', 'configurations', 'areas', 'rera'] as const;
  for (const k of keys) {
    const a = merged[k] as { value: unknown; conflict?: unknown; sourceId?: string } | undefined;
    const b = secondary[k] as { value: unknown; sourceId?: string } | undefined;
    if (!b) continue;
    if (!a) {
      (merged as unknown as Record<string, unknown>)[k] = structuredClone(b);
      continue;
    }
    if (JSON.stringify(a.value) !== JSON.stringify(b.value)) {
      a.conflict = {
        values: [
          { value: a.value, sourceId: a.sourceId ?? 'primary' },
          { value: b.value, sourceId: b.sourceId ?? 'secondary' },
        ],
        note: `Merged from ${secondary.id} on ${now.slice(0, 10)}`,
      };
    }
  }
  const srcIds = new Set(merged.sources.map((s) => s.id));
  merged.sources.push(...secondary.sources.filter((s) => !srcIds.has(s.id)));
  const urls = new Set(merged.media.map((m) => m.url));
  merged.media.push(...secondary.media.filter((m) => !urls.has(m.url)));
  merged.updatedAt = now;
  merged.publication = 'needs_review';
  merged.dataQuality = 'has_conflicts';
  merged.reviewNotes = `${merged.reviewNotes ?? ''}\nMerged with ${secondary.id} (${secondary.name}). Review conflicts.`.trim();
  return merged;
}
