# Data sources and method

All data was checked on **19 November 2026** unless stated otherwise.

## 1. City framework: SMC zones

| Source | URL | Notes |
|---|---|---|
| SMC — Zones: Functions | https://www.suratmunicipal.gov.in/Zones/Functions | Lists the nine zones: West, Central, North, East A, East B, South A, South B, South West, South East. |
| SMC — Demographics | https://www.suratmunicipal.gov.in/TheCity/Demographics | Page updated 18 Dec 2025. States 9 zones, 461.60 sq km and 30 election wards. |
| SMC — Disaster Management & Preparedness Plan (2026 ed.) | https://www.suratmunicipal.gov.in/Content/Documents/Downloads/DMP_English.pdf | Zone-wise tables use older zone names: Rander, Athwa, Udhna A/B, Limbayat, Varachha A/B, Katargam, Central. These are recorded as `formerNames`. |

**Boundary:** we did not find a free, authoritative SMC zone or city boundary file, so the site draws no boundaries. Zone browsing is a labelled list.

## 2. Locality → zone

A locality's zone confidence is one of:

- **`source_indicated`** (60 localities): an SMC page names the locality, its civic centre or a zone project under that zone. Evidence pages:
  - City Civic Center list — https://www.suratmunicipal.gov.in/Services/CityCivicCenterListOfCenters (page last updated 19 Mar 2022, so it may be outdated)
  - South West Zone projects 2019-20 — https://www.suratmunicipal.gov.in/Zones/Southwest/SWZ_Projects (updated 21 Oct 2019)
  - The DMP above
  - An AMRUT project listing that names Kanakpur-Kansad, Pali, Sachin, Pardi-Kande, Talangpur and Umber as newly added areas. This was seen in search results.
- **`inferred`** (36): commonly associated with the zone but not named on the pages we checked. Shown as "Inferred — needs verification". Examples: Citylight, Nanpura, Gopipura, Jahangirpura, Amroli.
- **`unverified`** (4): zone not established. These are Khatodara, Fulpada, Yogi Chowk and A K Road.

The evidence for each locality is in `zoneEvidence` in `src/data/localities.json`. Authoring lives in `scripts/build-geo.mjs`.

## 3. PIN codes

- **Source:** India Post, *All India Pincode Directory*, published on data.gov.in (https://www.data.gov.in/catalog/all-india-pincode-directory) under **GODL-India**.
- **Fetch route:** data.gov.in reset connections from our build environment, so the file came from its 1:1 GitHub republication, https://raw.githubusercontent.com/dropdevrahul/pincodes-india/main/pincode.csv. **Re-verify against data.gov.in when reachable.** The raw Surat subset is committed at `data/sources/indiapost_surat_district.csv`.
- **Inclusion:** all 456 directory rows with District = SURAT are kept in `src/data/postOffices.json`.
- **Locality ↔ PIN mapping:** a locality gets a PIN only when an India Post office of that locality's name carries it. The office names are listed explicitly per locality in `build-geo.mjs`. The relation is many-to-many: for example, 395007 maps to Vesu, Piplod, Magdalla, Khajod, Bharthana, Umra, Abhva and Gaviyar.
- **Caveats:**
  - A PIN is **not** a boundary. 395005 covers Rander and also villages such as Dihen and Narthan that are outside the SMC limit.
  - Rows not linked to a locality stay `unclassified`. They may be inside or outside SMC.
  - We make **no claim** about the total number of "Surat city PIN codes".
  - Post-office latitude and longitude in the directory are **not** used as locality coordinates.
- **Surat district outside SMC:** not in the default search. A separate "nearby" scope can be added later using the unclassified rows.

## 4. Projects (initial seed)

- **Intended primary source:** Gujarat RERA (https://gujrera.gujarat.gov.in/). It returned **HTTP 503** on the check date.
- **Source actually used:** public project pages on **PropTech Pulse** (aurumproptech.in/pulse/rera/gujarat/surat/…), a third-party site that republishes Gujarat RERA registration data and states it does not guarantee accuracy.
- **Fields taken:** project name, promoter, RERA registration number, approval date, registered address, PIN (when shown), status, proposed completion date, number of homes and blocks, BHK (when shown), and quarterly progress with its month.
- **Fields deliberately not taken:**
  - Total project cost, because it is not a home price.
  - Project-total carpet area, because no unit is stated and it is not a unit area.
  - Any photos, descriptions or marketplace content.
- **Labelling:** every record is `dataQuality: third_party_source` or `has_conflicts`, carries a GujRERA source marked `unavailable`, and has review notes asking for verification on GujRERA.
- **Recorded conflicts:**
  - *Raghuvir Spectrum:* "Completed" versus 96.74% progress, so it is shown as "Status unverified".
  - *Vardan Luxuria:* inconsistent progress table, so progress is not shown.
  - *Sangini Epitome:* the source gives PIN 395009, while India Post lists Bhatha SO under 394510. Noted on the record.
- **Locality inferred:** *Sangini Aura*. The source address names no locality; listing portals place it in Pal.
- **Excluded:** *Shubham Villa*, a plotted development and not residential homes.
- **Discovery leads:** listing portals such as housing.com and ghar.tv were used only to discover project names. No content was taken from them.

## 5. What remains to verify

- Every RERA number, status and completion date against GujRERA.
- All `inferred` zone placements, against SMC ward/zone lists or an official boundary file if one becomes available.
- PIN data against the live data.gov.in file.
