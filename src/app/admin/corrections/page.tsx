import Link from 'next/link';
import { repo } from '@/lib/repo';
import { formatDate } from '@/lib/format';
import { StatusSelect } from '../StatusSelect';

export default async function CorrectionsPage() {
  const [items, projects] = await Promise.all([repo().listCorrections(), repo().listProjects({ includeUnpublished: true })]);
  return (
    <>
      <h1 className="admin-h1">Corrections &amp; submissions</h1>
      <p className="small muted">Check the evidence, update the record (with its source), then resolve. Never apply a correction without a source.</p>
      {items.length === 0 ? <p className="muted">Nothing in the queue.</p> : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Received</th><th>Project / field</th><th>Details</th><th>From</th><th>Status</th></tr></thead>
            <tbody>
              {items.map((c) => {
                const p = projects.find((x) => x.id === c.projectId);
                return (
                  <tr key={c.id}>
                    <td className="small">{formatDate(c.createdAt)}</td>
                    <td className="small">{p ? <Link href={`/admin/projects/${encodeURIComponent(p.id)}`}>{p.name}</Link> : c.projectId ? c.projectId : 'New submission'}<div className="tiny muted">{c.field ?? 'general'}</div></td>
                    <td className="small" style={{ maxWidth: 380, whiteSpace: 'pre-wrap' }}>{c.details}{c.evidenceUrl && <div><a href={c.evidenceUrl} target="_blank" rel="noopener noreferrer nofollow">Evidence</a></div>}</td>
                    <td className="small">{c.submitterRole ?? '—'}<div className="tiny muted">{c.contact ?? ''}</div></td>
                    <td><StatusSelect kind="correction" id={c.id} value={c.status} options={['open', 'resolved', 'rejected']} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
