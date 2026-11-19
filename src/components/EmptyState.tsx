import Link from 'next/link';

export function EmptyState({ title, body, action }: { title: string; body: string; action?: { href: string; label: string } }) {
  return (
    <div className="empty">
      <div className="empty__mark weave" aria-hidden="true" />
      <h2 className="empty__title">{title}</h2>
      <p className="muted">{body}</p>
      {action && (
        <Link href={action.href} className="btn btn-ghost">
          {action.label}
        </Link>
      )}
    </div>
  );
}
