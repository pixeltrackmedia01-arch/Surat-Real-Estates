#!/usr/bin/env node
/**
 * Builds the locality / zone / post-office dataset used by the site.
 *
 *   node scripts/build-geo.mjs
 *
 * Inputs
 *   - data/sources/indiapost_surat_district.csv  (India Post All India Pincode Directory, rows with District = SURAT)
 *   - the AUTHORED tables below (zones, sources, localities with evidence)
 * Outputs
 *   - src/data/geoSources.json, zones.json, localities.json, postOffices.json
 *
 * Method (also documented in docs/DATA_SOURCES.md):
 *   - Zones: the nine zones named on the official SMC zones page.
 *   - Locality -> zone: 'source_indicated' only when an SMC page lists that locality's civic
 *     centre / office / project under the zone. Otherwise 'inferred' (commonly associated, needs
 *     verification) or null + 'unverified'.
 *   - Locality -> PIN: taken from India Post offices whose office name matches the locality
 *     (listed explicitly in `offices`). A PIN is NOT a boundary; one PIN often spans several
 *     localities and villages outside the SMC limit.
 *   - Post-office coordinates in the directory are not used as locality coordinates.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const CHECKED = '2026-11-19';

const geoSources = [
  {
    id: 'smc_zones',
    name: 'SMC — Zones: Functions (nine zones)',
    url: 'https://www.suratmunicipal.gov.in/Zones/Functions',
    publisher: 'Surat Municipal Corporation',
    checkedAt: CHECKED,
    note: 'Lists West, Central, North, East A, East B, South A, South B, South West and South East zones.',
  },
  {
    id: 'smc_demographics',
    name: 'SMC — The City: Demographics',
    url: 'https://www.suratmunicipal.gov.in/TheCity/Demographics',
    publisher: 'Surat Municipal Corporation',
    pageUpdated: '2025-12-18',
    checkedAt: CHECKED,
    note: 'States the city is divided into 9 zones; 461.60 sq km; 30 election wards.',
  },
  {
    id: 'smc_civic',
    name: 'SMC — City Civic Center: List of Centers',
    url: 'https://www.suratmunicipal.gov.in/Services/CityCivicCenterListOfCenters',
    publisher: 'Surat Municipal Corporation',
    pageUpdated: '2022-03-19',
    checkedAt: CHECKED,
    note: 'Civic centres grouped by zone with addresses. Page last updated 2022; may be outdated.',
  },
  {
    id: 'smc_swz',
    name: 'SMC — South West Zone: on-going / planned projects 2019-20',
    url: 'https://www.suratmunicipal.gov.in/Zones/Southwest/SWZ_Projects',
    publisher: 'Surat Municipal Corporation',
    pageUpdated: '2019-10-21',
    checkedAt: CHECKED,
    note: 'Names localities where South West Zone works were planned.',
  },
  {
    id: 'smc_dmp',
    name: 'SMC — Disaster Management & Preparedness Plan (English, 2026 edition)',
    url: 'https://www.suratmunicipal.gov.in/Content/Documents/Downloads/DMP_English.pdf',
    publisher: 'Surat Municipal Corporation',
    checkedAt: CHECKED,
    note: 'Zone-wise tables use older zone names (Rander, Athwa, Udhna A/B, Limbayat, Varachha A/B, Katargam, Central).',
  },
  {
    id: 'amrut_kanakpur',
    name: 'AMRUT approved projects — water supply for newly added Kanakpur-Kansad, Pali, Sachin, Pardi-Kande, Talangpur and Umber areas',
    url: 'https://amrut.mohua.gov.in/approvedProjects/list/c3cwOVlFOG1BckF5cE9mQVVFbWhSdz09/TFd6dmV4R01mZngxWTRnM0cvNG1VUT09',
    publisher: 'Ministry of Housing and Urban Affairs (AMRUT)',
    checkedAt: CHECKED,
    note: 'Seen in search results only; indicates these areas are within SMC (South Zone B area).',
  },
  {
    id: 'indiapost',
    name: 'India Post — All India Pincode Directory',
    url: 'https://www.data.gov.in/catalog/all-india-pincode-directory',
    publisher: 'Department of Posts, Government of India (via data.gov.in)',
    checkedAt: CHECKED,
    licence: 'Government Open Data License – India (GODL-India)',
    note:
      'data.gov.in reset connections from our build environment on the check date, so the file was obtained from the 1:1 GitHub republication at https://raw.githubusercontent.com/dropdevrahul/pincodes-india/main/pincode.csv. Re-verify against data.gov.in when reachable.',
  },
];

const zones = [
  { id: 'west', name: 'West Zone', formerNames: ['Rander Zone'], officeLocality: 'Tadwadi, New Rander Road' },
  { id: 'central', name: 'Central Zone', formerNames: [], officeLocality: 'Muglisara' },
  { id: 'north', name: 'North Zone', formerNames: ['Katargam Zone'], officeLocality: 'Katargam' },
  { id: 'east-a', name: 'East Zone A', formerNames: ['Varachha Zone-A'], officeLocality: 'Lambe Hanuman Road, Varachha' },
  { id: 'east-b', name: 'East Zone B', formerNames: ['Varachha Zone-B', 'Sarthana'], officeLocality: 'Sarthana' },
  { id: 'south-a', name: 'South Zone A', formerNames: ['Udhna Zone-A'], officeLocality: 'Udhna' },
  { id: 'south-b', name: 'South Zone B', formerNames: ['Udhna Zone-B', 'Kanakpur'], officeLocality: 'Kanakpur' },
  { id: 'south-west', name: 'South West Zone', formerNames: ['Athwa Zone'], officeLocality: 'Ghod Dod Road' },
  { id: 'south-east', name: 'South East Zone', formerNames: ['Limbayat Zone'], officeLocality: 'Dumbhal, Limbayat' },
].map((z) => ({ ...z, sourceIds: ['smc_zones', 'smc_civic', 'smc_dmp'] }));

// [id, name, aliases, zoneId|null, confidence, evidence sourceIds, India Post office names, note?]
const S = 'source_indicated';
const I = 'inferred';
const U = 'unverified';
const CIVIC = 'Civic centre listed under this zone on the SMC civic-centre page.';
const SWZ = 'Named on the SMC South West Zone projects page.';
const INF = 'Commonly associated with this zone; not named on the SMC pages we checked. Needs verification.';

const L = [
  // West Zone
  ['adajan', 'Adajan', ['Adajan Gam', 'Adajan Patiya', 'Adajan Patia'], 'west', S, ['smc_civic'], ['Adajan BO'], CIVIC],
  ['pal', 'Pal', ['Pal Gam', 'Pal Gaam', 'Paal'], 'west', S, ['smc_civic'], ['PAL SO', 'Pal Bhatha BO'], CIVIC],
  ['palanpur', 'Palanpur', ['Palanpore', 'Palanpur Gam', 'Palanpur Canal Road'], 'west', S, ['smc_civic'], ['Palanpur BO'], CIVIC],
  ['ichhapore', 'Ichhapore', ['Ichchhapor', 'Ichhapor', 'Ichapore'], 'west', S, ['smc_civic'], ['Ichhapore BO'], CIVIC],
  ['bhatha', 'Bhatha', ['Bhatha Gam'], 'west', S, ['smc_civic'], ['Bhatha SO'], CIVIC],
  ['bhesan', 'Bhesan', ['Bhesan Gam', 'Bhesaan'], 'west', S, ['smc_civic'], ['Bhesan BO'], CIVIC],
  ['rander', 'Rander', ['Rander Road', 'New Rander Road', 'Randher'], 'west', S, ['smc_civic', 'smc_dmp'], ['Rander SO'], 'West Zone was formerly called Rander Zone; zone office on New Rander Road.'],
  ['tadwadi', 'Tadwadi', ['Tadwadi Rander'], 'west', S, ['smc_civic'], [], 'West Zone office address is in Tadwadi.'],
  ['jahangirpura', 'Jahangirpura', ['Jahangir Pura', 'Jahangirpura Gam'], 'west', I, [], [], INF],
  ['gorat', 'Gorat', ['Gaurav Path', 'Adajan Gorat'], 'west', I, [], [], INF],
  ['variav', 'Variav', ['Variyav', 'Variav Gam'], 'west', I, [], ['Variav SO'], INF],
  ['ramnagar', 'Ramnagar', ['Ram Nagar Rander'], 'west', I, [], ['Ramnagar SO Surat'], INF],
  ['anand-mahal-road', 'Anand Mahal Road', ['Anandmahal Road'], 'west', I, [], ['Anand Mahal Road SO'], INF],
  ['bhatpore', 'Bhatpore', ['Bhatpor'], 'west', I, [], ['Bhatpore BO'], INF],
  ['honey-park-road', 'Honey Park Road', ['Honey Park'], 'west', I, [], [], INF],
  ['morabhagal', 'Morabhagal', ['Mora Bhagal'], 'west', S, ['smc_dmp'], [], 'Listed under Rander (West) zone in the SMC DMP siren table.'],

  // Central Zone
  ['muglisara', 'Muglisara', ['Mughlisara'], 'central', S, ['smc_civic'], ['Muglisara SO'], CIVIC],
  ['ring-road', 'Ring Road', ['Textile Market', 'Millennium Market', 'M G Road'], 'central', S, ['smc_civic'], ['Surat Textile Market SO'], 'Ring Road civic centre (near Millennium Market) is listed under Central Zone.'],
  ['nanpura', 'Nanpura', ['Nanpara', 'Timaliawad'], 'central', I, [], ['Nanpura HO'], INF],
  ['gopipura', 'Gopipura', ['Gopi Pura'], 'central', I, [], ['Gopipura SO'], INF],
  ['sagrampura', 'Sagrampura', ['Sagrampura Putli'], 'central', I, [], ['Sagrampura Putli SO'], INF],
  ['bhagal', 'Bhagal', ['Bhagal Chowk'], 'central', I, [], ['Bhagal SO'], INF],
  ['chowk-bazar', 'Chowk Bazar', ['Chowk', 'Chowkbazar'], 'central', I, [], [], INF],
  ['salabatpura', 'Salabatpura', ['Salabat Pura'], 'central', I, [], [], INF],
  ['mahidharpura', 'Mahidharpura', ['Mahidhar Pura'], 'central', I, [], [], INF],
  ['begumpura', 'Begumpura', ['Begampura'], 'central', I, [], [], INF],
  ['zampa-bazar', 'Zampa Bazar', ['Jhampa Bazar', 'Jhampa'], 'central', I, [], ['Jhampa SO'], INF],
  ['khatodara', 'Khatodara', ['Khatodra'], null, U, [], ['Khatodara SO'], 'Zone not established from the sources checked.'],

  // North Zone
  ['katargam', 'Katargam', ['Katargaam', 'Katargam Gam'], 'north', S, ['smc_civic', 'smc_dmp'], ['Katargam SO'], 'North Zone was formerly called Katargam Zone; zone office in Katargam.'],
  ['ved-road', 'Ved Road', ['Ved', 'Vedroad'], 'north', S, ['smc_civic'], [], CIVIC],
  ['dabholi', 'Dabholi', ['Dabholi Gam', 'Govindnagar'], 'north', S, ['smc_civic'], ['Dabholi BO'], CIVIC],
  ['chhaprabhatha', 'Chhaprabhatha', ['Chhapra Bhatha', 'Chapra Bhatha'], 'north', S, ['smc_civic'], ['Chhapra Bhatha BO'], CIVIC],
  ['kosad', 'Kosad', ['Kosad Gam'], 'north', S, ['smc_civic'], ['Kosad BO'], CIVIC],
  ['gothan', 'Gothan', ['Gothan Gam'], 'north', S, ['smc_civic'], [], CIVIC],
  ['segwa-syadla', 'Segwa-Syadla', ['Segwa', 'Syadla'], 'north', S, ['smc_civic'], [], CIVIC],
  ['amroli', 'Amroli', ['Amroli Gam'], 'north', I, [], ['Amroli SO'], INF],
  ['utran', 'Utran', ['Utran Gam'], 'north', I, [], ['Utran BO', 'Utran Power House SO'], INF],
  ['singanpore', 'Singanpore', ['Singanpor', 'Singanpur'], 'north', I, [], ['Singanpore BO'], INF],
  ['motived', 'Motived', ['Mota Ved', 'Moti Ved'], 'north', I, [], ['Motived BO'], INF],
  ['fulpada', 'Fulpada', ['Phulpada'], null, U, [], ['Fulpada BO'], 'Zone not established from the sources checked.'],

  // East Zone A
  ['varachha', 'Varachha', ['Varachha Road', 'Varacha', 'Varachha Rd', 'Lambe Hanuman Road'], 'east-a', S, ['smc_civic', 'smc_dmp'], ['Varachha Road SO'], 'East Zone A office is on Lambe Hanuman Road, Varachha; formerly Varachha Zone-A.'],
  ['kapodra', 'Kapodra', ['Kapodra Char Rasta', 'Karanj'], 'east-a', S, ['smc_civic', 'smc_dmp'], [], 'Karanj civic centre (near Kapodra circle) is listed under East Zone A.'],
  ['puna', 'Puna', ['Puna Gam', 'Puna Kumbharia'], 'east-a', S, ['smc_civic'], ['Puna Kumbharia SO'], CIVIC],
  ['hirabaug', 'Hirabaug', ['Hira Baug', 'Hirabag'], 'east-a', I, [], [], INF],
  ['yogi-chowk', 'Yogi Chowk', ['Yogichowk'], null, U, [], [], 'Zone not established from the sources checked.'],
  ['a-k-road', 'A K Road', ['Ashwanikumar Road', 'Ashwini Kumar Road'], null, U, [], ['A K Road SO'], 'Zone not established from the sources checked.'],

  // East Zone B
  ['mota-varachha', 'Mota Varachha', ['Mota Varacha', 'Motavaracha', 'Mota Varachha Gam'], 'east-b', S, ['smc_civic'], ['Mota Varachha SO'], CIVIC],
  ['nana-varachha', 'Nana Varachha', ['Nana Varacha', 'Nanavarachha'], 'east-b', S, ['smc_civic'], [], CIVIC],
  ['sarthana', 'Sarthana', ['Sarthana Jakatnaka'], 'east-b', S, ['smc_civic'], ['Sarthana SO'], 'East Zone B office is at Sarthana.'],
  ['kathor', 'Kathor', ['Kathore'], 'east-b', S, ['smc_civic'], ['Kathor SO'], CIVIC],
  ['pasodara', 'Pasodara', ['Pasodra'], 'east-b', S, ['smc_civic'], ['Pasodara BO'], CIVIC],
  ['laskana', 'Laskana', ['Laskana Gam'], 'east-b', S, ['smc_civic'], ['Laskana BO'], CIVIC],
  ['kosmada', 'Kosmada', [], 'east-b', I, [], ['Kosmada BO'], INF],
  ['valak', 'Valak', ['Valak Patiya'], 'east-b', I, [], ['Valak BO'], INF],
  ['abrama', 'Abrama', ['Abrama Gam'], 'east-b', I, [], ['Abrama BO'], INF],

  // South Zone A
  ['udhna', 'Udhna', ['Udhana', 'Udhna Gam', 'Udhnagam'], 'south-a', S, ['smc_civic', 'smc_dmp'], ['Udhna SO', 'Udhnagam SO'], 'South Zone A office is in Udhna; formerly Udhna Zone-A.'],
  ['bhestan', 'Bhestan', ['Bhestan Gam'], 'south-a', S, ['smc_civic', 'smc_dmp'], ['Bhestan SO'], CIVIC],
  ['pandesara', 'Pandesara', ['Pandesara GIDC', 'Pandesara Housing'], 'south-a', S, ['smc_civic'], ['Pandesara IE SO'], CIVIC],
  ['bamroli', 'Bamroli', ['Bamroli Gam'], 'south-a', I, [], ['Bamroli BO'], INF],
  ['vadod', 'Vadod', [], 'south-a', I, [], [], INF],

  // South Zone B
  ['kanakpur', 'Kanakpur', ['Kanakpur-Kansad'], 'south-b', S, ['smc_civic', 'amrut_kanakpur'], ['Kanakpur BO'], 'South Zone B office is at Kanakpur.'],
  ['kansad', 'Kansad', [], 'south-b', S, ['amrut_kanakpur'], ['Kansad BO'], 'Named with Kanakpur in an AMRUT project for newly added SMC areas.'],
  ['sachin', 'Sachin', ['Sachin GIDC', 'Sachin Gam'], 'south-b', S, ['amrut_kanakpur'], ['Sachin SO', 'Sachin RS BO'], 'Named with Kanakpur in an AMRUT project for newly added SMC areas.'],
  ['pali', 'Pali', ['Pali Gam'], 'south-b', S, ['amrut_kanakpur'], [], 'Named with Kanakpur in an AMRUT project for newly added SMC areas.'],
  ['talangpur', 'Talangpur', [], 'south-b', S, ['amrut_kanakpur'], ['Talangpur BO'], 'Named with Kanakpur in an AMRUT project for newly added SMC areas.'],
  ['umber', 'Umber', ['Umbher'], 'south-b', S, ['amrut_kanakpur'], ['Umber BO'], 'Named with Kanakpur in an AMRUT project for newly added SMC areas.'],
  ['budia', 'Budia', ['Budiya', 'Jiav-Budia'], 'south-b', S, ['smc_dmp'], ['Budia BO'], 'Budiya gam appears under South Zone (Udhna-B) in the SMC DMP.'],
  ['unn', 'Unn', ['Un Gam'], 'south-b', I, [], ['Unn BO'], INF],
  ['lajpore', 'Lajpore', ['Lajpor'], 'south-b', I, [], ['Lajpore SO'], INF],

  // South West Zone
  ['vesu', 'Vesu', ['Vesu Gam', 'VIP Road', 'Vesu-Abhwa', 'Vesu Canal Road'], 'south-west', S, ['smc_swz'], ['Vesu BO'], SWZ],
  ['althan', 'Althan', ['Althan Gam', 'Althan-Bhatar', 'Althan Canal Road'], 'south-west', S, ['smc_swz'], ['Althan SO'], SWZ],
  ['bhatar', 'Bhatar', ['Bhatar Road'], 'south-west', S, ['smc_swz'], [], SWZ],
  ['piplod', 'Piplod', ['Pipload', 'Piplod Road'], 'south-west', S, ['smc_swz'], ['Piplod SO Surat'], SWZ],
  ['bharthana', 'Bharthana', ['Bharthana-Vesu', 'Bharthana Vesu'], 'south-west', S, ['smc_swz'], ['Bharthana BO'], SWZ],
  ['bhimrad', 'Bhimrad', ['Bhimrad Gam'], 'south-west', S, ['smc_swz'], [], SWZ],
  ['khajod', 'Khajod', ['Khajod Gam'], 'south-west', S, ['smc_swz'], ['Khajod BO'], SWZ],
  ['magdalla', 'Magdalla', ['Magdala', 'Rundh-Magdalla', 'Nava Magdalla'], 'south-west', S, ['smc_swz'], ['Magdalla BO'], SWZ],
  ['rundh', 'Rundh', ['Rundh Gam'], 'south-west', S, ['smc_swz'], [], SWZ],
  ['majura-gate', 'Majura Gate', ['Majura', 'Majuragate'], 'south-west', S, ['smc_swz', 'smc_dmp'], [], SWZ],
  ['umra', 'Umra', ['Umra Gam', 'Athwa-Umra'], 'south-west', S, ['smc_swz'], ['Umra BO'], SWZ],
  ['abhva', 'Abhva', ['Abhwa', 'Abhava'], 'south-west', S, ['smc_swz'], ['Abhva BO'], SWZ],
  ['athwa', 'Athwa', ['Athwalines', 'Athwa Lines', 'Athwa Gate', 'Chaupati', 'Athawa'], 'south-west', S, ['smc_civic', 'smc_swz'], ['Athwalines SO'], 'South West Zone was formerly called Athwa Zone; Chaupati civic centre in Athwalines.'],
  ['ghod-dod-road', 'Ghod Dod Road', ['Ghoddod Road', 'Ghod-dod Road', 'Ghod Dod'], 'south-west', S, ['smc_civic'], [], 'South West Zone office is on Ghod Dod Road.'],
  ['dumas', 'Dumas', ['Dumas Road', 'Dumas Gam'], 'south-west', S, ['smc_civic', 'smc_swz'], ['Dumas SO', 'Dumasgam BO'], CIVIC],
  ['bhimpore', 'Bhimpore', ['Bhimpor'], 'south-west', S, ['smc_dmp'], ['Bhimpore BO'], 'Appears under South West (Athwa) zone in the SMC DMP.'],
  ['gaviyar', 'Gaviyar', ['Gavier', 'Gaviar'], 'south-west', I, [], ['Gavier BO'], INF],
  ['citylight', 'City Light', ['Citylight', 'City Light Road', 'Citylight Road'], 'south-west', I, [], [], INF + ' No India Post office of this name; PIN not established.'],
  ['parle-point', 'Parle Point', ['Parle Pt'], 'south-west', I, [], [], INF],
  ['new-citylight', 'New Citylight', ['New City Light'], 'south-west', I, [], [], INF],

  // South East Zone
  ['limbayat', 'Limbayat', ['Limbayat Gam', 'Maruti Nagar'], 'south-east', S, ['smc_civic', 'smc_dmp'], ['Limbayat SO'], 'South East Zone was formerly called Limbayat Zone.'],
  ['dumbhal', 'Dumbhal', ['Dumbhal Model Town'], 'south-east', S, ['smc_civic', 'smc_dmp'], [], 'South East Zone office is at Dumbhal.'],
  ['dindoli', 'Dindoli', ['Navagam-Dindoli', 'Dindoli Gam'], 'south-east', S, ['smc_civic'], ['Dindoli BO'], CIVIC],
  ['godadara', 'Godadara', ['Godadra'], 'south-east', S, ['smc_civic'], ['Godadara BO'], CIVIC],
  ['devadh', 'Devadh', ['Devad', 'Deladva-Devadh'], 'south-east', S, ['smc_civic'], ['Devadh BO'], CIVIC],
  ['kumbharia', 'Kumbharia', ['Kumbhariya'], 'south-east', S, ['smc_civic'], ['Kumbharia BO'], CIVIC],
  ['mandarwaja', 'Mandarwaja', ['Mandarvaja'], 'south-east', S, ['smc_dmp'], [], 'Appears under South East Zone (Limbayat) in the SMC DMP.'],
  ['parvat-patiya', 'Parvat Patiya', ['Parvat Gam', 'Parvat'], 'south-east', I, [], ['Parvat BO'], INF],
  ['magob', 'Magob', ['Magob Gam'], 'south-east', I, [], [], INF],
  ['saroli', 'Saroli', ['Saroli Gam'], 'south-east', I, [], ['Saroli BO'], INF + ' Note: India Post lists two offices named Saroli (395010 and 394520).'],
  ['deladva', 'Deladva', [], 'south-east', I, [], ['Deladva BO'], INF],
];

/* --------------------------- read India Post --------------------------- */
const csv = fs.readFileSync(path.join(ROOT, 'data/sources/indiapost_surat_district.csv'), 'utf8').trim().split('\n');
const header = parseRow(csv[0]);
const rows = csv.slice(1).map((line) => {
  const cells = parseRow(line);
  return Object.fromEntries(header.map((h, i) => [h, cells[i]]));
});
function parseRow(line) {
  return line
    .replace(/^"|"$/g, '')
    .split('","')
    .map((c) => c.trim());
}

const officeIndex = new Map();
for (const r of rows) officeIndex.set(`${r.OfficeName}|${r.Pincode}`, r);
const byName = new Map();
for (const r of rows) {
  if (!byName.has(r.OfficeName)) byName.set(r.OfficeName, []);
  byName.get(r.OfficeName).push(r);
}

const localities = [];
const officeLinks = new Map(); // "office|pin" -> Set(localityId)
for (const [id, name, aliases, zoneId, zoneConfidence, sourceIds, offices, note] of L) {
  const pins = new Set();
  for (const o of offices) {
    const matches = byName.get(o);
    if (!matches) throw new Error(`India Post office not found: ${o} (locality ${id})`);
    for (const m of matches) {
      pins.add(m.Pincode);
      const key = `${m.OfficeName}|${m.Pincode}`;
      if (!officeLinks.has(key)) officeLinks.set(key, new Set());
      officeLinks.get(key).add(id);
    }
  }
  localities.push({
    id,
    name,
    aliases,
    zoneId,
    zoneConfidence: zoneId ? zoneConfidence : 'unverified',
    zoneEvidence: note,
    pinCodes: [...pins].sort(),
    pinConfidence: pins.size ? 'source_indicated' : 'unverified',
    sourceIds: [...new Set([...sourceIds, ...(pins.size ? ['indiapost'] : [])])],
  });
}

const postOffices = rows
  .map((r) => {
    const ids = [...(officeLinks.get(`${r.OfficeName}|${r.Pincode}`) ?? [])];
    return {
      office: r.OfficeName,
      pin: r.Pincode,
      officeType: r.OfficeType,
      delivery: r.Delivery,
      division: r.DivisionName,
      localityIds: ids,
      scope: ids.length ? 'city_linked' : 'unclassified',
    };
  })
  .sort((a, b) => a.pin.localeCompare(b.pin) || a.office.localeCompare(b.office));

const out = path.join(ROOT, 'src/data');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'geoSources.json'), JSON.stringify(geoSources, null, 2) + '\n');
fs.writeFileSync(path.join(out, 'zones.json'), JSON.stringify(zones, null, 2) + '\n');
fs.writeFileSync(path.join(out, 'localities.json'), JSON.stringify(localities, null, 2) + '\n');
fs.writeFileSync(path.join(out, 'postOffices.json'), JSON.stringify(postOffices) + '\n');

const counts = localities.reduce((a, l) => ((a[l.zoneConfidence] = (a[l.zoneConfidence] ?? 0) + 1), a), {});
console.log(`localities: ${localities.length}`, counts);
console.log(`post offices (Surat district rows): ${postOffices.length}, linked: ${postOffices.filter((p) => p.scope === 'city_linked').length}`);
