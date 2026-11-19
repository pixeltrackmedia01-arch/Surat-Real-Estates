import { EmptyState } from '@/components/EmptyState';

export default function NotFound() {
  return (
    <div className="container page">
      <EmptyState title="We couldn’t find that page" body="The project or locality may have been renamed, merged or unpublished." action={{ href: '/projects', label: 'Browse projects' }} />
    </div>
  );
}
