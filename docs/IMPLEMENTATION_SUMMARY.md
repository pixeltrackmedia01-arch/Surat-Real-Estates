# Implementation summary — first release

## What works

- **Discover:**
  - The home page has a combobox search that tolerates misspellings and aliases ("Varacha" → Varachha) and accepts PIN codes. It also has quick filters, a browse grid of the 9 SMC zones, a "recently updated" section (shown only when records exist), a source explainer and a developer CTA.
  - `/projects` filters by locality, zone, BHK, budget, status, possession timing, and area by explicit area type. It sorts by relevance or recently updated; price sorting is disabled when no prices exist. It shows a result count, active-filter chips, clear-all, shareable URLs and "load more".
  - Filters work without JavaScript (GET form). On mobile they open as a bottom sheet.
- **Compare:** up to 3 projects, kept in localStorage and in a shareable `/compare?ids=` URL. On mobile the table has a sticky first column, and missing values are labelled.
- **Project page:** status and data-quality badges, a RERA reference with a link to GujRERA, and per-field provenance, notes and conflicts. Area is always labelled with its type. Photos, floor plans and 3D appear only for permission-granted media. A map appears only with sourced coordinates. The page also has sources with last-checked dates, related projects, a report-an-issue form, and site-visit / request-details CTAs (sticky on mobile).
- **Lead form:** an accessible `<dialog>` with inline validation (Indian mobile format, required consent, future date), a honeypot, a minimum fill time, an idempotency key, a per-IP rate limit, and the project id and source page.
  - It reports truthfully: *saved* (Supabase), *development: stored locally, not sent*, or *not sent* (no database).
- **3D:** Three.js GLB/glTF viewer, loaded only on demand. It supports Draco and meshopt, has a 25 MB cap, progress, error, unsupported and too-large fallbacks, keyboard, mouse and touch controls, and reset. It respects reduced motion and labels illustrative models. No current project has a 3D asset, so it is not rendered anywhere yet.
- **Admin** (`/admin`, password plus signed cookie): project list with publication and flag filters; a full editor (per-field provenance, source and review flag; sources with stale or unavailable state; media with permission and attribution; publication and quality; JSON mode); CSV/JSON import with dry run and duplicate detection; manual merge; private enquiry and correction inboxes.
- **Data:** 9 zones, 100 localities (60 zone placements sourced to SMC documents, 36 inferred, 4 unestablished), 456 India Post entries with many-to-many locality links, and 12 seed projects.

## Where the data came from

See `docs/DATA_SOURCES.md`. In summary:
- Zones: SMC website pages and the 2026 DMP.
- PINs: the India Post directory (GODL-India), fetched through a GitHub mirror because data.gov.in was unreachable.
- Projects: a third-party RERA mirror (PropTech Pulse), because GujRERA returned HTTP 503. Every project is labelled "Third-party source", none is labelled developer-confirmed, and none has prices, unit areas or media.

## Unavailable or blocked

| Item | Status | What's needed |
|---|---|---|
| Database (leads, corrections, admin edits in production) | **Not connected.** Supabase project creation failed because the account is at its free-tier limit of 2 projects. | Free a Supabase slot or use an existing project, apply `supabase/migrations/0001_init.sql`, run `scripts/seed-supabase.mjs`, then set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in Vercel. Until then, production enquiries are refused with a clear "not sent" message. |
| GujRERA verification | Portal returned 503 | Re-check each seed record on GujRERA, then set `dataQuality: source_checked` and source kind `rera`. |
| Photos, floor plans, 3D | None supplied | Developer-supplied assets with a recorded permitted use. |
| Prices and unit areas | None sourced | Developer price sheets or brochures, recorded as developer-provided, with the area type stated. |
| Coordinates and maps | None sourced | Reliable project coordinates, for example from the developer or the RERA site plan. |
| SMC boundary map | No free authoritative file found | An official GeoJSON or shapefile, if SMC or the state publishes one. |
| Public contact email | Not set | `NEXT_PUBLIC_CONTACT_EMAIL` |
| Privacy and terms | Engineering draft | Legal review, including under the DPDP Act 2023, and a retention period. |
