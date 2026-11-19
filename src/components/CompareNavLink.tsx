'use client';

import Link from 'next/link';
import { useApp } from './Providers';

export function CompareNavLink() {
  const { compare } = useApp();
  const href = compare.length ? `/compare?ids=${compare.map((c) => c.id).join(',')}` : '/compare';
  return (
    <Link href={href}>
      Compare
      {compare.length > 0 && (
        <span className="nav-count" aria-label={`${compare.length} selected`}>
          {compare.length}
        </span>
      )}
    </Link>
  );
}
