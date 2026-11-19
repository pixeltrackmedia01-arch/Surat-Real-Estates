import type { Metadata } from 'next';
import Link from 'next/link';
import { geoSources, localities, zones } from '@/lib/geo';
import postOffices from '@/data/postOffices.json';
import type { PostOffice } from '@/lib/types';

export const metadata: Metadata = { title: 'Methodology & sources', description: 'How the Surat Home Index collects, labels and checks project, locality, zone and PIN-code data.' };

export default function Methodology() {
  const po = postOffices as PostOffice[];
  const conf = localities.reduce<Record<string, number>>((a, l) => ((a[l.zoneConfidence] = (a[l.zoneConfidence] ?? 0) + 1), a), {});
  return (
    <div className="container page prose">
      <p className="eyebrow">Methodology</p>
      <h1>How this index is built</h1>
      <p className="lede">
        We list residential projects within the Surat Municipal Corporation (SMC) area and show, for each important fact, where
        it came from and when we checked it. We do not claim to cover every project in Surat.
      </p>

      <h2>What each label means</h2>
      <dl className="glossary">
        <dt>Source-reported</dt><dd>Taken from a cited public source. The source, its type and the check date are listed on the project page.</dd>
        <dt>Developer-provided</dt><dd>Supplied directly by the developer or promoter. Only this label means the developer gave us the information.</dd>
        <dt>Admin-entered</dt><dd>Entered by our administrators, normally while correcting a record with evidence.</dd>
        <dt>Inferred — not verified</dt><dd>Derived by us from other evidence, for example matching an address to a locality.</dd>
        <dt>Unverified / Not provided</dt><dd>We have no reliable value. We show “Not provided” instead of guessing.</dd>
        <dt>Third-party source</dt><dd>The record relies on a secondary source, such as a site that republishes RERA data, and has not yet been checked against the official portal.</dd>
        <dt>Conflicting source data</dt><dd>Sources disagree. We show the cautious value and keep both versions for review; we do not pick the more attractive figure.</dd>
      </dl>

      <h2>Projects</h2>
      <ul>
        <li><strong>Preferred sources:</strong> the official Gujarat RERA portal, developer websites and brochures (with permission for media), and direct submissions by developers or administrators.</li>
        <li><strong>Initial records:</strong> the first records were compiled on 19 Nov 2026 from public pages of <em>PropTech Pulse</em> (aurumproptech.in), which republishes Gujarat RERA registration data. The official GujRERA portal returned HTTP 503 that day. These records are labelled <em>Third-party source</em> and are queued for checking against GujRERA.</li>
        <li><strong>Prices:</strong> shown only when a source states a unit price, and labelled as an asking price with a last-checked date. Total project cost in RERA filings is <em>not</em> a home price and is never shown as one.</li>
        <li><strong>Areas:</strong> always labelled carpet, built-up or super built-up, never blended.</li>
        <li><strong>Status &amp; possession:</strong> taken from the registration record. A proposed completion date is not a possession guarantee.</li>
        <li><strong>Not used:</strong> marketplace photos, floor plans, descriptions, contact details or reviews. We do not bypass logins, CAPTCHAs or rate limits.</li>
        <li><strong>Duplicates:</strong> detected by RERA number (ignoring amendment or extension suffixes) and by name plus developer plus locality. Merges are manual.</li>
      </ul>

      <h2>Photos, floor plans and 3D</h2>
      <p>
        Media appears only after its source, attribution and permitted use are recorded. Renders and reconstructed 3D models
        are labelled <em>illustrative</em>. We do not use AI-generated images as evidence of a real project, or generate
        buildings from photos and present them as accurate.
      </p>

      <h2 id="localities">Zones, localities and PIN codes</h2>
      <ul>
        <li><strong>Zones:</strong> the {zones.length} current SMC zones ({zones.map((z) => z.name).join(', ')}), as listed on the SMC zones page.</li>
        <li>
          <strong>Localities:</strong> {localities.length} localities. {conf.source_indicated ?? 0} are placed in a zone because an SMC document names them under it
          (for example, the civic-centre list, zone project pages, or the Disaster Management Plan). {conf.inferred ?? 0} are placed by common association and
          marked <em>inferred</em>. For {conf.unverified ?? 0}, the zone is not established.
        </li>
        <li>
          <strong>PIN codes:</strong> from the India Post All India Pincode Directory. A locality is linked to a PIN only when an India Post office of that
          locality’s name carries it. The directory lists {po.length} post-office entries with District = Surat; {po.filter((o) => o.scope === 'city_linked').length} are linked
          to a locality here. The others are kept but unclassified, because a PIN can cover several localities and villages outside the SMC limit.
          We do not claim a definitive count of “Surat city PIN codes”.
        </li>
        <li><strong>Boundaries:</strong> we did not find a free, authoritative SMC boundary file, so we draw no city or zone boundaries. Maps appear only for projects with sourced coordinates.</li>
        <li><strong>Surat district areas outside SMC</strong> are not part of the default search. A separate “nearby” scope may be added later.</li>
      </ul>

      <h3>Geographic sources</h3>
      <ul className="small">
        {geoSources.map((s) => (
          <li key={s.id}>
            <a href={s.url} target="_blank" rel="noopener noreferrer">{s.name}</a> — {s.publisher}. Checked {s.checkedAt}
            {s.pageUpdated ? `; page last updated ${s.pageUpdated}` : ''}.{s.licence ? ` Licence: ${s.licence}.` : ''} {s.note}
          </li>
        ))}
      </ul>

      <h2>Corrections</h2>
      <p>
        Every project page has a “Report an incorrect or outdated detail” link. Developers can <Link href="/submit">submit projects or corrections</Link>.
        We change a record only with evidence, and record who supplied each fact.
      </p>
    </div>
  );
}
