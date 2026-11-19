'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { X } from 'lucide-react';
import { MAX_COMPARE, useApp } from './Providers';

export function CompareTray() {
  const { compare, removeCompare, clearCompare } = useApp();
  const path = usePathname();
  if (!compare.length || path.startsWith('/compare') || path.startsWith('/admin')) return null;
  return (
    <aside className="compare-tray" aria-label="Projects selected for comparison">
      <div className="container compare-tray__inner">
        <ul className="compare-tray__list">
          {compare.map((c) => (
            <li key={c.id} className="compare-tray__item">
              <span>{c.name}</span>
              <button type="button" onClick={() => removeCompare(c.id)} aria-label={`Remove ${c.name} from comparison`}>
                <X size={14} aria-hidden="true" />
              </button>
            </li>
          ))}
          <li className="tiny muted compare-tray__count">
            {compare.length}/{MAX_COMPARE}
          </li>
        </ul>
        <div className="compare-tray__actions">
          <button type="button" className="linklike small" onClick={clearCompare}>
            Clear
          </button>
          <Link
            className="btn btn-ink btn-sm"
            href={`/compare?ids=${compare.map((c) => c.id).join(',')}`}
            aria-disabled={compare.length < 2}
          >
            Compare {compare.length >= 2 ? compare.length : ''}
          </Link>
        </div>
      </div>
    </aside>
  );
}
