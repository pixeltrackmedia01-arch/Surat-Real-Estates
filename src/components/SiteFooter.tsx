import Link from 'next/link';
import { SITE } from '@/lib/site';

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container site-footer__grid">
        <div>
          <p className="brand__name" style={{ marginBottom: 8 }}>
            {SITE.name}
          </p>
          <p className="small muted" style={{ maxWidth: '42ch' }}>
            An independent index of residential projects within the Surat Municipal Corporation area. Listings are
            compiled from public sources and are not endorsed or confirmed by developers unless stated.
          </p>
        </div>
        <nav aria-label="About">
          <p className="eyebrow">About</p>
          <ul>
            <li><Link href="/about">About this index</Link></li>
            <li><Link href="/methodology">Methodology &amp; sources</Link></li>
            <li><Link href="/submit">Submit or correct a project</Link></li>
          </ul>
        </nav>
        <nav aria-label="Browse">
          <p className="eyebrow">Browse</p>
          <ul>
            <li><Link href="/projects">All projects</Link></li>
            <li><Link href="/localities">Localities &amp; zones</Link></li>
            <li><Link href="/compare">Compare</Link></li>
          </ul>
        </nav>
        <nav aria-label="Legal">
          <p className="eyebrow">Legal</p>
          <ul>
            <li><Link href="/privacy">Privacy</Link></li>
            <li><Link href="/terms">Terms</Link></li>
            <li><Link href="/contact">Contact</Link></li>
          </ul>
        </nav>
      </div>
      <div className="container site-footer__base tiny muted">
        <span>Not a substitute for checking registration details on the official Gujarat RERA portal.</span>
        <span>Postal data: India Post (GODL-India). Zones: Surat Municipal Corporation.</span>
      </div>
    </footer>
  );
}
