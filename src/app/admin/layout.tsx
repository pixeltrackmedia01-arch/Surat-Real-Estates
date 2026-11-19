import type { Metadata } from 'next';
import Link from 'next/link';
import { storageMode } from '@/lib/repo';
import { LogoutButton } from './LogoutButton';

export const metadata: Metadata = { title: 'Admin', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const mode = storageMode();
  return (
    <div className="admin">
      <div className="admin-bar">
        <div className="container admin-bar__inner">
          <nav aria-label="Admin" className="admin-nav">
            <Link href="/admin">Projects</Link>
            <Link href="/admin/projects/new">Add project</Link>
            <Link href="/admin/import">Import</Link>
            <Link href="/admin/merge">Merge duplicates</Link>
            <Link href="/admin/leads">Enquiries</Link>
            <Link href="/admin/corrections">Corrections</Link>
          </nav>
          <div className="admin-bar__right">
            <span className={`badge ${mode === 'supabase' ? 'badge-ok' : 'badge-warn'}`}>
              Storage: {mode === 'supabase' ? 'Supabase (production)' : mode === 'local-dev' ? 'Local files (development)' : 'None — read-only'}
            </span>
            <LogoutButton />
          </div>
        </div>
      </div>
      {mode === 'none' && (
        <div className="container">
          <p className="notice notice-warn small" style={{ marginTop: 16 }}>
            No database is connected to this deployment. You can review records and run import dry-runs, but saving,
            publishing, enquiries and corrections are disabled. Set <code>SUPABASE_URL</code> and{' '}
            <code>SUPABASE_SERVICE_ROLE_KEY</code> (server-side) and apply <code>supabase/migrations/0001_init.sql</code>.
          </p>
        </div>
      )}
      <div className="container admin-main">{children}</div>
    </div>
  );
}
