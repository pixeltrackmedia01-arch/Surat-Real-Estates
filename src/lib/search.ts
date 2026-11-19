import type { AreaKind, Project, ProjectStatus } from './types';
import { getLocality, isPinQuery, localitiesForPin, matchLocalities, normalise } from './geo';
import { BUDGET_BANDS } from './labels';

export type SortKey = 'relevance' | 'updated' | 'price_asc' | 'price_desc';

export interface Filters {
  q: string;
  loc: string[];
  zone: string;
  bhk: string[];
  budget: string;
  status: ProjectStatus[];
  possession: string; // "2027" => declared completion on/before end of 2027; "ready" => completed/ready
  amin?: number;
  amax?: number;
  atype: AreaKind;
  sort: SortKey;
  page: number;
}

export const PAGE_SIZE = 12;

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';
const many = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v : v ? [v] : []).flatMap((x) => x.split(',')).map((x) => x.trim()).filter(Boolean);
const num = (v: string) => (v && !Number.isNaN(Number(v)) ? Number(v) : undefined);

export function parseFilters(sp: SP): Filters {
  const sort = one(sp.sort) as SortKey;
  const atype = one(sp.atype) as AreaKind;
  return {
    q: one(sp.q).slice(0, 80),
    loc: many(sp.loc).filter((id) => getLocality(id)),
    zone: one(sp.zone),
    bhk: many(sp.bhk),
    budget: one(sp.budget),
    status: many(sp.status) as ProjectStatus[],
    possession: one(sp.possession),
    amin: num(one(sp.amin)),
    amax: num(one(sp.amax)),
    atype: ['carpet', 'built_up', 'super_built_up'].includes(atype) ? atype : 'carpet',
    sort: ['relevance', 'updated', 'price_asc', 'price_desc'].includes(sort) ? sort : 'relevance',
    page: Math.max(1, Math.min(50, Number(one(sp.page)) || 1)),
  };
}

export function filtersToQuery(f: Partial<Filters>): string {
  const p = new URLSearchParams();
  if (f.q) p.set('q', f.q);
  if (f.loc?.length) p.set('loc', f.loc.join(','));
  if (f.zone) p.set('zone', f.zone);
  if (f.bhk?.length) p.set('bhk', f.bhk.join(','));
  if (f.budget) p.set('budget', f.budget);
  if (f.status?.length) p.set('status', f.status.join(','));
  if (f.possession) p.set('possession', f.possession);
  if (f.amin) p.set('amin', String(f.amin));
  if (f.amax) p.set('amax', String(f.amax));
  if ((f.amin || f.amax) && f.atype && f.atype !== 'carpet') p.set('atype', f.atype);
  if (f.sort && f.sort !== 'relevance') p.set('sort', f.sort);
  if (f.page && f.page > 1) p.set('page', String(f.page));
  const s = p.toString();
  return s ? `?${s}` : '';
}

const priceMin = (p: Project) => {
  const v = p.price.value;
  return v.kind === 'starting' || v.kind === 'range' ? (v.unit === 'per_sq_ft' ? undefined : v.min) : undefined;
};
const priceMax = (p: Project) => {
  const v = p.price.value;
  return v.kind === 'range' && v.unit !== 'per_sq_ft' ? v.max ?? v.min : priceMin(p);
};

function bhkMatches(p: Project, wanted: string[]): boolean {
  if (!wanted.length) return true;
  const have = p.configurations.value;
  return wanted.some((w) =>
    w === '5+ BHK' ? have.some((h) => parseInt(h, 10) >= 5) : have.includes(w),
  );
}

/** Relevance: exact name > name prefix > locality/alias > developer > PIN > address. */
function textScore(p: Project, q: string): number {
  if (!q) return 1;
  const nq = normalise(q);
  if (!nq) return 1;
  const name = normalise(p.name);
  let s = 0;
  if (name === nq) s = Math.max(s, 100);
  else if (name.startsWith(nq)) s = Math.max(s, 85);
  else if (name.includes(nq)) s = Math.max(s, 70);

  if (isPinQuery(q)) {
    const pin = q.trim();
    if (p.pinCodes.value.includes(pin)) s = Math.max(s, 75);
    if (localitiesForPin(pin).some((l) => l.id === p.localityId.value)) s = Math.max(s, 55);
  }
  const loc = matchLocalities(q).find((m) => m.locality.id === p.localityId.value);
  if (loc) s = Math.max(s, Math.min(80, loc.score - 5));
  const dev = normalise(p.developer.value);
  if (nq.length >= 3 && dev.includes(nq)) s = Math.max(s, 65);
  if (p.rera && normalise(p.rera.value.number).includes(nq) && nq.length >= 5) s = Math.max(s, 90);
  if (nq.length >= 4 && p.address && normalise(p.address.value).includes(nq)) s = Math.max(s, 40);
  return s;
}

export interface SearchResult {
  items: Project[];
  total: number;
  page: number;
  pages: number;
  priceSortAvailable: boolean;
  interpretedLocalities: string[]; // locality names the text query resolved to
}

export function searchProjects(all: Project[], f: Filters): SearchResult {
  const band = BUDGET_BANDS.find((b) => b.id === f.budget);
  const nowYear = new Date().getFullYear();
  const scored: { p: Project; s: number }[] = [];

  for (const p of all) {
    const loc = getLocality(p.localityId.value);
    if (f.loc.length && !f.loc.includes(p.localityId.value)) continue;
    if (f.zone && loc?.zoneId !== f.zone) continue;
    if (!bhkMatches(p, f.bhk)) continue;
    if (f.status.length && !f.status.includes(p.status.value)) continue;
    if (band) {
      const lo = priceMin(p);
      const hi = priceMax(p);
      if (lo === undefined) continue; // no price -> cannot claim it is in budget
      if (band.max !== undefined && lo > band.max) continue;
      if (band.min !== undefined && (hi ?? lo) < band.min) continue;
    }
    if (f.possession) {
      if (f.possession === 'ready') {
        if (!['completed', 'ready_to_move', 'possession_available'].includes(p.status.value)) continue;
      } else {
        const y = Number(f.possession);
        const d = p.completionDate?.value;
        if (!d || Number(d.slice(0, 4)) > y || Number(d.slice(0, 4)) < nowYear - 1) continue;
      }
    }
    if (f.amin || f.amax) {
      const areas = p.areas.value.filter((a) => a.kind === f.atype);
      if (!areas.length) continue;
      const ok = areas.some((a) => {
        const lo = a.min ?? a.max ?? 0;
        const hi = a.max ?? a.min ?? 0;
        return (!f.amin || hi >= f.amin) && (!f.amax || lo <= f.amax);
      });
      if (!ok) continue;
    }
    const s = textScore(p, f.q);
    if (s <= 0) continue;
    scored.push({ p, s });
  }

  const priceSortAvailable = scored.some(({ p }) => priceMin(p) !== undefined);
  const byUpdated = (a: Project, b: Project) => b.updatedAt.localeCompare(a.updatedAt) || a.name.localeCompare(b.name);
  scored.sort((a, b) => {
    switch (f.sort) {
      case 'updated':
        return byUpdated(a.p, b.p);
      case 'price_asc':
      case 'price_desc': {
        const pa = priceMin(a.p);
        const pb = priceMin(b.p);
        if (pa === undefined && pb === undefined) return byUpdated(a.p, b.p);
        if (pa === undefined) return 1; // unpriced always last
        if (pb === undefined) return -1;
        return f.sort === 'price_asc' ? pa - pb : pb - pa;
      }
      default:
        return b.s - a.s || byUpdated(a.p, b.p);
    }
  });

  const total = scored.length;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(f.page, pages);
  return {
    // "Load more" pattern: page N shows the first N pages of results.
    items: scored.slice(0, page * PAGE_SIZE).map((x) => x.p),
    total,
    page,
    pages,
    priceSortAvailable,
    interpretedLocalities: f.q ? matchLocalities(f.q).slice(0, 3).map((m) => m.locality.name) : [],
  };
}

export function relatedProjects(all: Project[], p: Project, n = 3): Project[] {
  const zone = getLocality(p.localityId.value)?.zoneId;
  return all
    .filter((x) => x.id !== p.id)
    .map((x) => {
      let s = 0;
      if (x.localityId.value === p.localityId.value) s += 3;
      else if (zone && getLocality(x.localityId.value)?.zoneId === zone) s += 1;
      if (x.configurations.value.some((c) => p.configurations.value.includes(c))) s += 1;
      const a = priceMin(p);
      const b = priceMin(x);
      if (a && b && Math.abs(a - b) / a < 0.3) s += 2;
      return { x, s };
    })
    .filter((r) => r.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, n)
    .map((r) => r.x);
}
