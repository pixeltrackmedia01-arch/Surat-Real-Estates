import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE } from '@/lib/site';
import { EnquireButton } from '@/components/ProjectActions';

export const metadata: Metadata = { title: 'Contact' };

export default function Contact() {
  return (
    <div className="container page prose">
      <p className="eyebrow">Contact</p>
      <h1>Contact</h1>
      {SITE.contactEmail ? (
        <p>Email: <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a></p>
      ) : (
        <p className="notice small">A public contact email has not been configured yet. Use the forms below in the meantime.</p>
      )}
      <ul>
        <li>For a general home-search enquiry: <EnquireButton project={null} intent="details" className="linklike" label="send an enquiry" /></li>
        <li>For a project correction or new listing: <Link href="/submit">submit or correct a project</Link></li>
      </ul>
    </div>
  );
}
