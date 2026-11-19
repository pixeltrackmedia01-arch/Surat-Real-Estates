import type { Project, ProvenanceKind, SourceKind } from './types';
import { projectSchema } from './validation';
import { getLocality, matchLocalities } from './geo';
import { findDuplicates, type DuplicateMatch } from './dedupe';

/**
 * Import pipeline for admin uploads (CSV or JSON). See docs/IMPORT_SCHEMA.md.
 * Every row is validated; nothing is written in dry-run mode.
 */

export const CSV_COLUMNS = [
  'id',
  'slug',
  'name',
  'developer',
  'locality',
  'address',
  'pin_codes',
  'status',
  'status_note',
  'rera_number',
  'rera_approved_on',
  'completion_date',
  'price_kind',
  'price_min',
  'price_max',
  'price_unit',
  'price_qualification',
  'configurations',
  'area_kind',
  'area_min',
  'area_max',
  'area_unit',
  'units_total',
  'amenities',
  'provenance',
  'source_name',
  'source_url',
  'source_kind',
  'checked_at',
  'publication',
] as const;

export function parseCSV(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') {
      row.push(cell);
      cell = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      if (row.some((x) => x.trim())) rows.push(row);
      row = [];
      cell = '';
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x.trim())) rows.push(row);
  const [head, ...body] = rows;
  if (!head) return [];
  const keys = head.map((h) => h.trim().toLowerCase());
  return body.map((r) => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? '').trim()])));
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
const list = (s?: string) => (s ? s.split(/[;|]/).map((x) => x.trim()).filter(Boolean) : []);
const n = (s?: string) => (s && !Number.isNaN(Number(s.replace(/,/g, ''))) ? Number(s.replace(/,/g, '')) : undefined);

export function csvRowToProject(r: Record<string, string>, now = new Date().toISOString()): { project?: Project; errors: string[] } {
  const errors: string[] = [];
  if (!r.name) errors.push('name is required');
  if (!r.source_name) errors.push('source_name is required — every record needs a source');
  const prov = (r.provenance || 'sourced') as ProvenanceKind;
  if (!['sourced', 'developer', 'admin', 'inferred', 'unverified'].includes(prov)) errors.push(`provenance "${r.provenance}" is invalid`);

  let localityId = r.locality;
  let localityProv: ProvenanceKind = prov;
  if (localityId && !getLocality(localityId)) {
    const m = matchLocalities(localityId)[0];
    if (m && m.score >= 80) {
      localityId = m.locality.id;
    } else if (m) {
      localityId = m.locality.id;
      localityProv = 'inferred';
    } else errors.push(`locality "${r.locality}" not recognised — add it to the locality dataset first`);
  }
  if (!localityId) errors.push('locality is required');
  const checkedAt = r.checked_at || now.slice(0, 10);
  const srcId = `src-${slugify(r.source_name || 'import')}-${checkedAt}`;
  const base = { provenance: prov, sourceId: srcId, checkedAt };
  const slug = r.slug || slugify(`${r.name}-${localityId}`);

  const areaKind = r.area_kind as 'carpet' | 'built_up' | 'super_built_up';
  if ((r.area_min || r.area_max) && !['carpet', 'built_up', 'super_built_up'].includes(areaKind)) {
    errors.push('area_kind must be carpet, built_up or super_built_up when an area is given');
  }
  const priceKind = (r.price_kind || 'not_provided') as Project['price']['value']['kind'];

  const project: Project = {
    id: r.id || `prj-${slug}`,
    slug,
    name: r.name,
    developer: { value: r.developer || 'Not provided', ...base, provenance: r.developer ? prov : 'unverified' },
    type: 'residential',
    localityId: { value: localityId, ...base, provenance: localityProv },
    address: r.address ? { value: r.address, ...base } : undefined,
    pinCodes: { value: list(r.pin_codes), ...base, provenance: r.pin_codes ? prov : 'unverified' },
    status: { value: (r.status || 'unverified') as Project['status']['value'], ...base, note: r.status_note || undefined, provenance: r.status ? prov : 'unverified' },
    rera: r.rera_number ? { value: { number: r.rera_number, url: 'https://gujrera.gujarat.gov.in/', approvedOn: r.rera_approved_on || undefined }, ...base } : undefined,
    completionDate: r.completion_date ? { value: r.completion_date, ...base } : undefined,
    price: {
      value: { kind: priceKind, min: n(r.price_min), max: n(r.price_max), unit: (r.price_unit as 'total' | 'per_sq_ft') || 'total', currency: 'INR', qualification: r.price_qualification || undefined },
      ...base,
      provenance: priceKind === 'not_provided' ? 'unverified' : prov,
    },
    configurations: { value: list(r.configurations), ...base, provenance: r.configurations ? prov : 'unverified' },
    areas: {
      value: r.area_min || r.area_max ? [{ kind: areaKind, min: n(r.area_min), max: n(r.area_max), unit: (r.area_unit as 'sq_ft' | 'sq_m') || 'sq_ft' }] : [],
      ...base,
      provenance: r.area_min || r.area_max ? prov : 'unverified',
    },
    unitsTotal: n(r.units_total) ? { value: n(r.units_total)!, ...base } : undefined,
    amenities: r.amenities ? { value: list(r.amenities), ...base } : undefined,
    media: [],
    sources: [
      {
        id: srcId,
        name: r.source_name,
        url: r.source_url || undefined,
        kind: (r.source_kind as SourceKind) || 'other',
        checkedAt,
        state: 'ok',
      },
    ],
    createdAt: now,
    updatedAt: now,
    publication: (r.publication as Project['publication']) || 'needs_review',
    dataQuality: prov === 'sourced' && r.source_kind === 'rera' ? 'source_checked' : 'third_party_source',
  };
  if (errors.length) return { errors };
  return { project, errors };
}

export interface ImportRowResult {
  row: number;
  name: string;
  ok: boolean;
  errors: string[];
  duplicates: { id: string; name: string; reason: string; strength: DuplicateMatch['strength'] }[];
  action: 'create' | 'update' | 'skip';
  project?: Project;
}

export function validateImport(
  input: { format: 'csv'; text: string } | { format: 'json'; data: unknown },
  existing: Project[],
): ImportRowResult[] {
  const now = new Date().toISOString();
  const candidates: { name: string; project?: Project; errors: string[] }[] =
    input.format === 'csv'
      ? parseCSV(input.text).map((r) => ({ name: r.name ?? '(no name)', ...csvRowToProject(r, now) }))
      : (Array.isArray(input.data) ? input.data : [input.data]).map((d) => {
          const res = projectSchema.safeParse(d);
          return res.success
            ? { name: res.data.name, project: res.data as Project, errors: [] }
            : { name: (d as { name?: string })?.name ?? '(no name)', errors: res.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`) };
        });

  const seen: Project[] = [...existing];
  return candidates.map((c, i) => {
    if (!c.project) return { row: i + 1, name: c.name, ok: false, errors: c.errors, duplicates: [], action: 'skip' as const };
    const v = projectSchema.safeParse(c.project);
    const errors = v.success ? [] : v.error.issues.map((x) => `${x.path.join('.')}: ${x.message}`);
    const sameId = existing.find((e) => e.id === c.project!.id);
    const dups = findDuplicates(c.project, seen.filter((s) => s.id !== c.project!.id));
    seen.push(c.project);
    const dupList = dups.map((d) => ({ id: d.existing.id, name: d.existing.name, reason: d.reason, strength: d.strength }));
    if (sameId) dupList.unshift({ id: sameId.id, name: sameId.name, reason: 'Same id — importing would overwrite this record', strength: 'certain' });
    return {
      row: i + 1,
      name: c.name,
      ok: errors.length === 0,
      errors,
      duplicates: dupList,
      action: errors.length ? 'skip' : sameId ? 'update' : 'create',
      project: c.project,
    };
  });
}
