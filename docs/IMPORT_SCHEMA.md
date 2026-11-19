# Import schema

Admins import at `/admin/import`. Always run a **dry run** first. Nothing is written until you press **Import**.

## CSV

One row per project. Use UTF-8 with a header row. Separate list values with `;`. Template: `data/import-template.csv`.

| Column | Required | Notes |
|---|---|---|
| `id` | – | Stable id. Defaults to `prj-<slug>`. A row whose id matches an existing record is flagged as a certain duplicate (overwrite) and held back unless allowed. |
| `slug` | – | Defaults to `name-locality`. |
| `name` | ✓ | Project name. |
| `developer` | – | Developer or promoter as registered. |
| `locality` | ✓ | Locality id (e.g. `vesu`) or a name or alias. Fuzzy matches are stored with provenance `inferred`. |
| `address` | – | Registered address or sub-locality. |
| `pin_codes` | – | e.g. `395007;395017` |
| `status` | – | `under_construction`, `completed`, `ready_to_move`, `possession_available` or `unverified` (default). |
| `status_note` | – | Explanation shown with the status. |
| `rera_number`, `rera_approved_on` | – | GujRERA registration and approval date (YYYY-MM-DD). |
| `completion_date` | – | Declared or proposed completion (YYYY-MM-DD). |
| `price_kind` | – | `starting`, `range`, `on_request` or `not_provided` (default). |
| `price_min`, `price_max` | – | INR numbers. |
| `price_unit` | – | `total` (default) or `per_sq_ft`. |
| `price_qualification` | – | e.g. "excl. GST & registration". |
| `configurations` | – | e.g. `2 BHK;3 BHK` |
| `area_kind` | if area given | `carpet`, `built_up` or `super_built_up`. Never leave area unlabelled. |
| `area_min`, `area_max`, `area_unit` | – | Numbers; unit is `sq_ft` (default) or `sq_m`. |
| `units_total` | – | Number of homes. |
| `amenities` | – | Only if sourced. `;`-separated. |
| `provenance` | – | Applies to every field in the row: `sourced` (default), `developer`, `admin`, `inferred` or `unverified`. |
| `source_name` | ✓ | Every record needs a source. |
| `source_url`, `source_kind`, `checked_at` | – | `source_kind` is `rera`, `rera_mirror`, `developer`, `government`, `submission` or `other`. `checked_at` defaults to today. |
| `publication` | – | `needs_review` (default), `draft`, `published` or `archived`. |

Data quality is set automatically. It is `source_checked` only when provenance is `sourced` and `source_kind` is `rera`; otherwise it is `third_party_source`.

## JSON

An array of full `Project` objects, as defined in `src/lib/types.ts` and validated by `projectSchema` in `src/lib/validation.ts`. This format supports per-field provenance, conflicts, multiple sources, multiple area rows and media. Template: `data/import-template.json`.

Media validation rules:
- `url`, `alt`, `attribution`, `sourceId` and `permission` are required.
- `bytes` must be 25 MB or less.
- Media is displayed only when `permission` is `granted`.

## Duplicate rules

- **Certain:** the same RERA number (ignoring amendment or extension suffixes such as `A1R` and `EX1`), or the same id.
- **Likely:** the same normalised name and locality.

Rows with a certain duplicate are held back unless "Allow" is ticked. To combine records, use **Merge duplicates**.
