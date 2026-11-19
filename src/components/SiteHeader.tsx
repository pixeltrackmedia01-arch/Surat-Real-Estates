import Link from 'next/link';
import { SITE } from '@/lib/site';
import { CompareNavLink } from './CompareNavLink';

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="container site-header__inner">
        <Link href="/" className="brand" aria-label={`${SITE.name} — home`}>
          <span className="brand__mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="22" height="22">
              <path d="M12 2 21 12 12 22 3 12Z" fill="none" stroke="currentColor" strokeWidth="1.6" />
              <path d="M3 12h18M12 2v20" stroke="currentColor" strokeWidth="1" opacity=".55" />
            </svg>
          </span>
          <span className="brand__name">{SITE.name}</span>
        </Link>
        <nav aria-label="Primary" className="site-nav">
          <Link href="/projects">Projects</Link>
          <Link href="/localities" className="site-nav__tertiary">Localities</Link>
          <CompareNavLink />
          <Link href="/methodology" className="site-nav__secondary">
            How we source
          </Link>
        </nav>
      </div>
    </header>
  );
}
