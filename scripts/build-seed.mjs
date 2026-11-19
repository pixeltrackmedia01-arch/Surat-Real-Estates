#!/usr/bin/env node
/**
 * Builds src/data/projects.seed.json — the initial published catalogue.
 *
 * Every fact below was read on CHECKED from a public "PropTech Pulse" RERA-mirror page
 * (aurumproptech.in), a third-party aggregator that republishes Gujarat RERA registration data
 * and carries its own accuracy disclaimer. The official GujRERA portal
 * (gujrera.gujarat.gov.in) returned HTTP 503 on the check date, so NO record here has been
 * checked against GujRERA, and none has been confirmed by its developer.
 *
 * Deliberately NOT included:
 *   - Prices: the mirror lists total project cost, which is not a unit price.
 *   - Unit areas: the mirror lists project-total carpet area without a unit.
 *   - Photos, floor plans, descriptions or contact details from any listing portal.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const CHECKED = '2026-11-19';
const NOW = `${CHECKED}T00:00:00.000Z`;
const MIRROR_NOTE =
  'Third-party RERA mirror. GujRERA was unavailable (HTTP 503) when checked, so this has not been verified on GujRERA.';
const GUJRERA = 'https://gujrera.gujarat.gov.in/';

const sf = (value, sourceId, extra = {}) => ({ value, provenance: 'sourced', sourceId, checkedAt: CHECKED, ...extra });

/** Authored records: [slug, name, mirrorUrl, data] */
const RAW = [
  {
    slug: 'sangini-nirvana-vesu',
    name: 'Sangini Nirvana',
    url: 'https://www.aurumproptech.in/pulse/rera/gujarat/surat/sangini-nirvana/12968',
    promoter: 'Vee Aar Life Space LLP',
    promoterNote: 'Promoter as registered. Marketed under the Sangini Group name on listing portals (not verified).',
    locality: 'vesu',
    address: 'TP 7, FP 33, VIP Road, N M Mavani Road Corner, Vesu, Surat',
    pins: [],
    status: 'under_construction',
    statusNote: 'Mirror reports RERA approval and "construction in progress; not yet completed".',
    rera: 'PR/GJ/SURAT/SURAT CITY/SUDA/RAA09351/201121',
    approvedOn: '2021-11-20',
    completion: '2027-08-31',
    configs: ['3 BHK'],
    units: 88,
    blocks: 2,
  },
  {
    slug: 'raghuvir-sierra-vesu',
    name: 'Raghuvir Sierra',
    url: 'https://www.aurumproptech.in/pulse/rera/gujarat/surat/raghuvir-sierra/18941',
    promoter: 'Raghuvir Developers & Builders',
    locality: 'vesu',
    address: 'TP Scheme No. 29 (Rundh – Vesu – Magdalla), R.S. No. 352/2, F.P. No. 76/1, Vesu, Surat',
    pins: [],
    status: 'under_construction',
    statusNote: 'Mirror reports RERA approval with construction in progress.',
    rera: 'PR/GJ/SURAT/SURAT CITY/SUDA/RAA12557/011123',
    approvedOn: '2023-11-01',
    completion: '2029-12-31',
    configs: ['4 BHK'],
    units: 48,
    blocks: 2,
  },
  {
    slug: 'raghuvir-spelito-magdalla',
    name: 'Raghuvir Spelito',
    url: 'https://www.aurumproptech.in/pulse/rera/gujarat/surat/raghuvir-spelito/16892',
    promoter: 'Raghuvir Developers & Builders',
    locality: 'magdalla',
    localityNote: 'Registered at Moje Magdalla; the mirror also describes it as being in the Vesu area (TP: Vesu-Magdalla).',
    address: 'TP 7, FP 68, R.S. No. 14-2/Paiky 1, Moje Magdalla, Surat',
    pins: ['395007'],
    status: 'under_construction',
    statusNote: 'Mirror shows project status "AWAITINGCOMPLIANCE" alongside RERA approval and construction in progress.',
    rera: 'PR/GJ/SURAT/SURAT CITY/SUDA/RAA12759/080124/311229',
    approvedOn: '2024-01-08',
    completion: '2029-12-31',
    configs: ['4 BHK'],
    units: 156,
    blocks: 6,
    progress: { percent: 72.3, asOf: '2026-04' },
  },
  {
    slug: 'raghuvir-shell-vesu',
    name: 'Raghuvir Shell',
    url: 'https://www.aurumproptech.in/pulse/rera/gujarat/surat/raghuvir-shell/1140',
    promoter: 'Raghuvir Developers & Builders',
    locality: 'vesu',
    address: 'T.P. No. 07 (Vesu), R.S. No. 18/5, F.P. No. 67, Moje Surat, Taluka Choryasi, Surat',
    pins: [],
    status: 'completed',
    statusNote: 'Mirror lists the project as "Completed" with end date 31 Dec 2018.',
    rera: 'PR/GJ/SURAT/CHORASI/SUDA/RAA00125/110917',
    approvedOn: '2017-09-11',
    completion: '2018-12-31',
    configs: [],
    units: 60,
    blocks: 3,
  },
  {
    slug: 'raghuvir-spectrum-vesu',
    name: 'Raghuvir Spectrum',
    url: 'https://www.aurumproptech.in/pulse/rera/gujarat/surat/raghuvir-spectrum/9880',
    promoter: 'Raghuvir Developers & Builders',
    locality: 'vesu',
    address: 'TP 16, 18, R.S. No. 224/2, 225/2, F.P. No. 16, 18, Moje Vesu, Surat',
    pins: [],
    status: 'unverified',
    statusNote:
      'Conflict in the source: listed as "Completed" (30 Jun 2026) but the latest quarterly progress shown is 96.74% (Apr 2026). Shown as unverified until checked on GujRERA.',
    statusConflict: [
      { value: 'completed', note: 'Status field: Completed' },
      { value: 'under_construction', note: 'Quarterly progress 96.74% (Apr 2026)' },
    ],
    rera: 'PR/GJ/SURAT/SURAT CITY/SUDA/RAA06991/EX1/250725/300626',
    reraNote: 'Registration number includes an extension (EX1). Another listing shows the original number PR/GJ/SURAT/SURATCITY/SUDA/RAA06991/140520.',
    approvedOn: '2020-05-14',
    completion: '2026-06-30',
    configs: [],
    units: 160,
    blocks: 4,
    progress: { percent: 96.74, asOf: '2026-04' },
    quality: 'has_conflicts',
  },
  {
    slug: 'raghuvir-satva-vesu',
    name: 'Raghuvir Satva',
    url: 'https://www.aurumproptech.in/pulse/rera/gujarat/surat/raghuvir-satva/10772',
    promoter: 'Raghuvir Developers & Builders',
    locality: 'vesu',
    address: 'TPS No. 29 (Rundh, Vesu, Magdalla), New S. No. 36, FP No. 66, Moje Vesu, Surat',
    pins: [],
    status: 'completed',
    statusNote: 'Mirror lists the project as "Completed" with end date 31 Dec 2024.',
    rera: 'PR/GJ/SURAT/SURAT CITY/SUDA/RAA07721/A1R/260523',
    reraNote: 'Number includes an amendment suffix (A1R). Another listing shows PR/GJ/SURAT/SURAT CITY/SUDA/RAA07721/021220.',
    approvedOn: '2020-12-02',
    completion: '2024-12-31',
    configs: [],
    units: 156,
    blocks: 3,
  },
  {
    slug: 'sangini-epitome-bhatha',
    name: 'Sangini Epitome',
    url: 'https://www.aurumproptech.in/pulse/rera/gujarat/surat/sangini-epitome/17049',
    promoter: 'Sangini Real Estate LLP',
    locality: 'bhatha',
    address: 'Opp. Green City, Bhatha, Surat',
    pins: ['395009'],
    pinNote: 'PIN as shown on the mirror page. India Post lists Bhatha SO under 394510; please verify.',
    status: 'under_construction',
    statusNote: 'Mirror reports RERA approval with construction in progress.',
    rera: 'PR/GJ/SURAT/SURAT CITY/SUDA/RAA13115/140324/301230',
    approvedOn: '2024-03-14',
    completion: '2030-12-30',
    configs: ['3 BHK', '4 BHK'],
    units: 276,
    progress: { percent: 47.31, asOf: '2026-04' },
  },
  {
    slug: 'one-tapi-piplod',
    name: 'One Tapi',
    url: 'https://www.aurumproptech.in/pulse/rera/gujarat/surat/one-tapi/20416',
    promoter: 'Pramukh Riverside Realty LLP',
    locality: 'piplod',
    address: 'TP S No. 6, FP No. 44, behind ISKON Mall, Piplod Road, Piplod, Surat',
    pins: ['395007'],
    status: 'under_construction',
    statusNote: 'Mirror shows registration approved and completion pending, with construction in progress.',
    rera: 'PR/GJ/SURAT/SURAT CITY/Surat Municipal Corporation/RAA13015/220224/311229',
    approvedOn: '2024-02-22',
    completion: '2029-12-31',
    configs: [],
    units: 28,
    progress: { percent: 44.2, asOf: '2026-04' },
  },
  {
    slug: 'sangini-aura',
    name: 'Sangini Aura',
    url: 'https://www.aurumproptech.in/pulse/rera/gujarat/surat/sangini-aura/18861',
    promoter: 'Sangini Associates',
    locality: 'pal',
    localityProvenance: 'inferred',
    localityNote: 'The mirror address ("Opp. Sportena Club, next lane to Kelly Residency") does not name a locality. Listing portals place it in Pal; not verified.',
    address: 'Opp. Sportena Club, next lane to Kelly Residency, Surat',
    pins: [],
    status: 'under_construction',
    statusNote: 'Mirror shows status "Approved" with block progress below 100%.',
    rera: 'PR/GJ/SURAT/SURAT CITY/SUDA/RAA11888/020623',
    approvedOn: '2023-06-02',
    completion: '2027-06-30',
    configs: [],
    units: 79,
    progress: { percent: 97.82, asOf: '2026-04' },
  },
  {
    slug: 'vardan-luxuria-mota-varachha',
    name: 'Vardan Luxuria',
    url: 'https://www.aurumproptech.in/pulse/rera/gujarat/surat/vardan-luxuria/18280',
    promoter: 'Vardan Infra',
    locality: 'mota-varachha',
    address: 'T.P.S. No. 25 (Mota Varachha), F.P. No. 29, Block No. 340, Moje Mota Varachha, Surat',
    pins: [],
    status: 'under_construction',
    statusNote:
      'Mirror shows approval with completion pending; block progress 30–71%. Its quarterly table also lists an implausible future 100% entry, so progress is not shown.',
    rera: 'PR/GJ/SURAT/SURAT CITY/SUDA/RAA11302/020323',
    approvedOn: '2023-03-02',
    completion: '2027-12-31',
    configs: [],
    units: 250,
    quality: 'has_conflicts',
  },
  {
    slug: 'shubham-pearl-palanpur',
    name: 'Shubham Pearl',
    url: 'https://www.aurumproptech.in/pulse/rera/gujarat/surat/shubham-pearl/17141',
    promoter: 'Kalubhai T Katrodiya (partnership firm, as listed)',
    locality: 'palanpur',
    address: 'Gaurav Path, Palanpore, Surat',
    pins: [],
    status: 'under_construction',
    statusNote: 'Mirror reports approval with construction in progress.',
    rera: 'PR/GJ/SURAT/SURAT CITY/SUDA/RAA10183/110522',
    approvedOn: '2022-05-11',
    completion: '2030-12-31',
    configs: ['2 BHK', '3 BHK'],
    units: 330,
    blocks: 6,
    progress: { percent: 66.42, asOf: '2024-10' },
  },
  {
    slug: 'shyam-luxuria-mota-varachha',
    name: 'Shyam Luxuria',
    url: 'https://www.aurumproptech.in/pulse/rera/gujarat/surat/shyam-luxuria/27209',
    promoter: 'Shyam Buildcon',
    locality: 'mota-varachha',
    address: 'Block No. 596/A, FP No. 204/A, near Rameshwaram Bungalows and Gopin Gam, Mota Varachha, Surat',
    pins: ['394101'],
    status: 'under_construction',
    statusNote: 'Mirror shows approval with completion pending.',
    rera: 'PR/GJ/SURAT/SURAT CITY/Surat Municipal Corporation/RAA15437/300625/311229',
    approvedOn: '2025-06-30',
    completion: '2029-12-31',
    configs: ['4 BHK'],
    units: 52,
    blocks: 2,
    progress: { percent: 29.17, asOf: '2026-04' },
  },
];

const projects = RAW.map((r) => {
  const srcId = `src-${r.slug}`;
  const sources = [
    { id: srcId, name: 'PropTech Pulse (Aurum PropTech) — RERA project page', url: r.url, kind: 'rera_mirror', checkedAt: CHECKED, state: 'ok', note: MIRROR_NOTE },
    { id: 'gujrera', name: 'Gujarat RERA (official portal)', url: GUJRERA, kind: 'rera', checkedAt: CHECKED, state: 'unavailable', note: 'Returned HTTP 503 on the check date.' },
  ];
  const status = sf(r.status, srcId, { note: r.statusNote });
  if (r.statusConflict) status.conflict = { values: r.statusConflict.map((c) => ({ ...c, sourceId: srcId })), note: 'Needs admin review against GujRERA.' };
  if (r.status === 'unverified') status.flaggedForReview = true;
  return {
    id: `prj-${r.slug}`,
    slug: r.slug,
    name: r.name,
    developer: sf(r.promoter, srcId, { note: r.promoterNote ?? 'Promoter name as shown in the registration record.' }),
    type: 'residential',
    localityId: { value: r.locality, provenance: r.localityProvenance ?? 'sourced', sourceId: srcId, checkedAt: CHECKED, note: r.localityNote },
    address: sf(r.address, srcId),
    pinCodes: r.pins.length ? sf(r.pins, srcId, { note: r.pinNote }) : { value: [], provenance: 'unverified', note: 'PIN not shown in the source.' },
    status,
    rera: sf({ number: r.rera, url: GUJRERA, approvedOn: r.approvedOn }, srcId, { note: r.reraNote ?? MIRROR_NOTE }),
    completionDate: sf(r.completion, srcId, { note: 'Proposed completion date in the registration record. Not a possession guarantee.' }),
    progress: r.progress ? sf(r.progress, srcId, { note: 'Quarterly progress as reported to RERA, per the mirror.' }) : undefined,
    price: { value: { kind: 'not_provided', currency: 'INR' }, provenance: 'unverified', note: 'No unit price in the source used. Total project cost is not shown because it is not a home price.' },
    configurations: r.configs.length ? sf(r.configs, srcId) : { value: [], provenance: 'unverified', note: 'Configuration not shown in the source.' },
    areas: { value: [], provenance: 'unverified', note: 'Unit areas not provided. The source lists only a project-total carpet area without a unit.' },
    unitsTotal: r.units ? sf(r.units, srcId) : undefined,
    blocks: r.blocks ? sf(r.blocks, srcId) : undefined,
    media: [],
    sources,
    createdAt: NOW,
    updatedAt: NOW,
    lastReviewedAt: NOW,
    publication: 'published',
    dataQuality: r.quality ?? 'third_party_source',
    reviewNotes: 'Verify registration number, status and completion date on GujRERA when the portal is reachable.',
  };
});

fs.writeFileSync(path.join(ROOT, 'src/data/projects.seed.json'), JSON.stringify(projects, null, 2) + '\n');
console.log(`wrote ${projects.length} projects`);
