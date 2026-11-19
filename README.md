# Surat Home Index

A source-tracked discovery site for residential projects across the Surat Municipal Corporation (SMC) area. Visitors can search, filter, compare and explore projects, view permission-cleared media and optional 3D models, and send a site-visit enquiry.

Every important fact carries provenance: where it came from, when it was checked, and whether it is source-reported, developer-provided, admin-entered, inferred or unverified.

**Stack:** Next.js 15 (App Router) · React 19 · TypeScript · Zod · lucide-react · Three.js (loaded on demand) · Leaflet + OpenStreetMap (loaded on demand) · optional Supabase/PostgreSQL. All open-source. No paid APIs.

---

## Quick start

```bash
npm install
```

```bash
cp .env.example .env.local
```

```bash
npm run dev
```

Before running `npm run dev`, set `ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET` (16+ characters) in `.env.local`. Then open http://localhost:3000, with admin at `/admin`.

Other checks: `npm run build` for a production build, `npm run lint` for a TypeScript check.

## Configuration

| Variable | Where | Purpose |
|---|---|---|
| `SUPABASE_URL` | server | Supabase project URL. When this and the key are set, storage = Supabase. |
| `SUPABASE_SERVICE_ROLE_KEY` | server only | Service-role key. **Never** expose it to the browser or commit it. |
| `ADMIN_PASSWORD` | server | Shared admin password. |
| `ADMIN_SESSION_SECRET` | server | 16+ characters, used to HMAC-sign the admin session cookie. |
| `NEXT_PUBLIC_SITE_URL` | public | Canonical site URL. |
| `NEXT_PUBLIC_CONTACT_EMAIL` | public | Optional monitored inbox shown on `/contact`. |

### Storage modes (`src/lib/repo`)

| Mode | When | Projects | Leads, corrections, admin edits |
|---|---|---|---|
| `supabase` | both Supabase variables set | `projects` table | Saved in Postgres (RLS: no public access) |
| `local-dev` | no Supabase, `NODE_ENV !== production` | seed overlaid with `.data/projects.local.json` | Written to `.data/*.local.json`. The UI says **"Development mode: stored locally, not sent"** |
| `none` | no Supabase, production | bundled seed (read-only) | **Refused.** `/api/leads` returns 503 and the form says the enquiry was **not sent** |

A production deployment never silently falls back to local files.

### Connecting Supabase (free tier)

1. Create a project. The Supabase free tier has project and usage limits and is a free-tier dependency, not guaranteed free at any scale.
2. Run `supabase/migrations/0001_init.sql` in the SQL editor.
3. Load the seed catalogue: `SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… node scripts/seed-supabase.mjs`
4. Set both variables in your host's **server** environment and redeploy.

**Where enquiries are stored and who can access them:** in the `leads` table. RLS is enabled with no policies, so the anon and authenticated roles cannot read it. Only server code using the service-role key can, and in this app that means signed-in admins at `/admin/leads`. Records include project id, source page, consent flag and an idempotency key (unique) that prevents duplicate submissions.

## Data

| File | What |
|---|---|
| `src/data/zones.json` | The 9 current SMC zones, with former names and sources |
| `src/data/localities.json` | 100 localities: aliases, zone plus confidence and evidence, PIN codes plus confidence, sources |
| `src/data/postOffices.json` | 456 India Post entries with District = Surat; many-to-many links to localities; unlinked entries stay `unclassified` |
| `src/data/geoSources.json` | Source URLs, check dates and licences for the geography data |
| `src/data/projects.seed.json` | 12 initial project records with per-field provenance |
| `data/sources/indiapost_surat_district.csv` | Raw India Post subset (GODL-India) |

Regenerate with `node scripts/build-geo.mjs` and `node scripts/build-seed.mjs`. Method and caveats are in [`docs/DATA_SOURCES.md`](docs/DATA_SOURCES.md).

## Source policy (summary)

- Use only real, sourced data. No invented projects, prices, statuses, RERA numbers, reviews or statistics.
- Preferred sources: GujRERA → developer sites and brochures → other public pages, as discovery leads only → direct developer or admin submission.
- Do not bypass logins, CAPTCHAs or rate limits. Do not copy marketplace photos, plans, descriptions or contacts. Do not scrape personal data.
- Show asking prices as source-reported with a last-checked date, never as transaction prices. Never show RERA total project cost as a price.
- Keep carpet, built-up and super built-up area separate and labelled.
- When sources conflict, record the conflict (`Field.conflict`), show the cautious value, and flag the record for review.
- Never imply developer confirmation. Only `provenance: 'developer'` is shown as "Developer-provided".

## Admin workflow (`/admin`)

1. **Sign in** with `ADMIN_PASSWORD`. The cookie is httpOnly, SameSite=strict, signed and valid for 8 hours. Middleware protects `/admin/*` and `/api/admin/*`.
2. **Projects:** filter by publication state, or by "flagged / conflicts / stale sources".
3. **Edit:** each field has a provenance, source reference, note and review flag. Manage sources, including marking them **stale** or **unavailable**. Manage media with attribution and permission. Set publication (draft, needs review, published, archived) and data quality. Advanced JSON editing is available.
4. **Import:** paste or upload CSV or JSON, run a **dry run**, then import. Schema: [`docs/IMPORT_SCHEMA.md`](docs/IMPORT_SCHEMA.md). Templates: `data/import-template.csv` and `data/import-template.json`.
5. **Duplicates:** detected by RERA number, ignoring amendment or extension suffixes, and by name + developer + locality. **Merge** keeps the primary record, unions sources and media, stores differing values as conflicts, and archives the secondary record.
6. **Enquiries** and **Corrections** inboxes are private, with status tracking.

To upgrade to multi-user admin, replace `src/lib/auth.ts` with Supabase Auth plus a role check.

## Media requirements

- Media appears publicly only when `permission: 'granted'` **and** a `permittedUse` is recorded, along with `attribution` and `sourceId`.
- Images: WebP or AVIF preferred, at least 1600px on the long edge, with meaningful `alt` text. Mark renders `illustrative: true`; they show an "Artist's impression" label.
- Floor plans: give a `label` (for example "3 BHK — Type A").
- 3D: **GLB or glTF only**, **25 MB maximum**, Draco or meshopt compression recommended, KTX2 or WebP textures, ideally under 300k triangles. Always supply a `previewUrl` image. Reconstructed or approximate models must be `illustrative: true`.
  - The viewer loads Three.js only when the visitor clicks "Load 3D model". It falls back to the preview and floor plans when WebGL is unavailable, the file is too large or loading fails.
  - Controls: mouse, touch and keyboard (arrow keys, +/−, R to reset). No auto-rotation, and reduced-motion preferences are respected.
- Never use AI-generated imagery as evidence of a real project.
- Remote media hosts must be added to `next.config.mjs` → `images.remotePatterns` if you switch to `next/image`.

## Deployment (Vercel Hobby, free tier)

1. Import the repo into Vercel. The Next.js preset is auto-detected.
2. Set `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET` and `NEXT_PUBLIC_SITE_URL`. Add the Supabase variables when available.
3. Deploy. Pages are statically generated and revalidated every 5 minutes; admin saves also trigger on-demand revalidation.

Vercel Hobby is a free-tier dependency with usage limits. Map tiles come from the OpenStreetMap tile servers, which are free but carry a [usage policy](https://operations.osmfoundation.org/policies/tiles/). For heavy traffic, switch to a self-hosted or commercial tile provider.

## Project layout

```
src/app/            routes (home, projects, project detail, compare, localities, zones, admin, API)
src/components/     UI components (cards, filters, lead sheet, 3D viewer, map…)
src/lib/            types, search, geo/alias matching, validation, dedupe, import, auth, repositories
src/data/           generated datasets
scripts/            dataset builders and Supabase seeding
supabase/           SQL migration
docs/               data sources, import schema, implementation summary
```
