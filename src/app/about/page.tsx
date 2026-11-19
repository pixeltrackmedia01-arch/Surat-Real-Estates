import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'About' };

export default function About() {
  return (
    <div className="container page prose">
      <p className="eyebrow">About</p>
      <h1>An independent index of Surat homes</h1>
      <p className="lede">
        Surat Home Index helps people looking for a new or recently completed home in Surat find residential projects in one
        place, compare them, and send a site-visit enquiry.
      </p>
      <p>
        We are not a developer, broker or regulator. A listing here does not mean the developer has endorsed or confirmed it.
        We publish only projects we can tie to a credible source, and we label where every important detail came from.
      </p>
      <p>
        Coverage is deliberately limited to residential projects within the Surat Municipal Corporation area that are under
        construction or recently completed. It grows as sourced records are added or submitted by developers.
      </p>
      <p>
        <Link href="/methodology">Read the methodology</Link> · <Link href="/submit">Submit a project</Link>
      </p>
    </div>
  );
}
