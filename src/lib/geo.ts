import zonesJson from '@/data/zones.json';
import localitiesJson from '@/data/localities.json';
import geoSourcesJson from '@/data/geoSources.json';
import type { GeoSource, Locality, Zone } from './types';

export const zones = zonesJson as Zone[];
export const localities = localitiesJson as Locality[];
export const geoSources = geoSourcesJson as GeoSource[];

const zoneById = new Map(zones.map((z) => [z.id, z]));
const localityById = new Map(localities.map((l) => [l.id, l]));

export const getZone = (id?: string | null) => (id ? zoneById.get(id) : undefined);
export const getLocality = (id?: string | null) => (id ? localityById.get(id) : undefined);
export const getGeoSource = (id: string) => geoSources.find((s) => s.id === id);

export const localitiesInZone = (zoneId: string) =>
  localities.filter((l) => l.zoneId === zoneId).sort((a, b) => a.name.localeCompare(b.name));

/** Lowercase, strip diacritics, punctuation and whitespace — "Ghod-Dod Rd" -> "ghoddodrd". */
export function normalise(s: string): string {
  return s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\broad\b/g, 'rd')
    .replace(/[^a-z0-9]/g, '');
}

/** Damerau-lite edit distance, bounded for short strings. */
export function editDistance(a: string, b: string, max = 3): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    let rowMin = Infinity;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) dp[i][j] = Math.min(dp[i][j], dp[i - 2][j - 2] + 1);
      rowMin = Math.min(rowMin, dp[i][j]);
    }
    if (rowMin > max) return max + 1;
  }
  return dp[a.length][b.length];
}

interface AliasEntry {
  key: string;
  localityId: string;
  label: string;
}
const aliasIndex: AliasEntry[] = localities.flatMap((l) =>
  [l.name, ...l.aliases].map((label) => ({ key: normalise(label), localityId: l.id, label })),
);

/** Resolve free text to localities, tolerating common misspellings ("Varacha", "Althaan"). */
export function matchLocalities(query: string): { locality: Locality; score: number; matched: string }[] {
  const q = normalise(query);
  if (q.length < 2) return [];
  const best = new Map<string, { score: number; matched: string }>();
  for (const e of aliasIndex) {
    let score = 0;
    if (e.key === q) score = 100;
    else if (e.key.startsWith(q)) score = 80 - (e.key.length - q.length);
    else if (q.length >= 4 && e.key.includes(q)) score = 60;
    else if (q.length >= 4) {
      const d = editDistance(q, e.key, 2);
      if (d <= (q.length >= 7 ? 2 : 1)) score = 50 - d * 10;
    }
    if (score > 0) {
      const prev = best.get(e.localityId);
      if (!prev || prev.score < score) best.set(e.localityId, { score, matched: e.label });
    }
  }
  return [...best.entries()]
    .map(([id, v]) => ({ locality: localityById.get(id)!, ...v }))
    .sort((a, b) => b.score - a.score);
}

export const isPinQuery = (q: string) => /^\s*39[0-9]{4}\s*$/.test(q);
export const localitiesForPin = (pin: string) => localities.filter((l) => l.pinCodes.includes(pin.trim()));
