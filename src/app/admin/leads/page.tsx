import { repo, storageMode } from '@/lib/repo';
import { formatDate } from '@/lib/format';
import { StatusSelect } from '../StatusSelect';

export default async function LeadsPage() {
  const leads = await repo().listLeads();
  const mode = storageMode();
  return (
    <>
      <h1 className="admin-h1">Enquiries</h1>
      <p className="small muted">
        Private. Stored {mode === 'supabase' ? 'in the Supabase “leads” table (RLS blocks public access; only the server role reads it)' : mode === 'local-dev' ? 'in .data/leads.local.json on this machine (development only)' : 'nowhere — no database is configured, so enquiries are refused'}.
      </p>
      {leads.length === 0 ? <p className="muted">No enquiries yet.</p> : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Received</th><th>Name &amp; mobile</th><th>Project</th><th>Budget / visit</th><th>Message</th><th>Status</th></tr></thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l.id}>
                  <td className="small">{formatDate(l.createdAt, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                  <td><strong>{l.name}</strong><div className="small"><a href={`tel:${l.mobile}`}>{l.mobile}</a></div></td>
                  <td className="small">{l.projectName ?? 'General'}<div className="tiny muted">{l.sourcePath}</div></td>
                  <td className="small">{l.budget || '—'}<div className="tiny muted">{l.visitPreference ?? ''} {l.preferredDate ?? ''}</div></td>
                  <td className="small" style={{ maxWidth: 280 }}>{l.message || '—'}</td>
                  <td><StatusSelect kind="lead" id={l.id} value={l.status} options={['new', 'contacted', 'closed', 'spam']} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
