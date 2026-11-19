'use client';

import { CalendarCheck, Columns3, MessageSquareText } from 'lucide-react';
import { type ProjectRef, useApp } from './Providers';

export function EnquireButton({
  project,
  intent = 'visit',
  className = 'btn btn-primary btn-sm',
  label,
}: {
  project: ProjectRef | null;
  intent?: 'visit' | 'details';
  className?: string;
  label?: string;
}) {
  const { openLead } = useApp();
  const Icon = intent === 'visit' ? CalendarCheck : MessageSquareText;
  return (
    <button type="button" className={className} onClick={() => openLead(project, intent)}>
      <Icon size={16} aria-hidden="true" />
      {label ?? (intent === 'visit' ? 'Schedule a site visit' : 'Request details')}
      {project && !label && <span className="visually-hidden"> for {project.name}</span>}
    </button>
  );
}

export function CompareToggle({ project, compact }: { project: ProjectRef; compact?: boolean }) {
  const { compare, toggleCompare } = useApp();
  const on = compare.some((c) => c.id === project.id);
  return (
    <button
      type="button"
      className={`btn btn-ghost btn-sm compare-toggle${on ? ' is-on' : ''}`}
      aria-pressed={on}
      onClick={() => toggleCompare(project)}
    >
      <Columns3 size={16} aria-hidden="true" />
      {compact ? (on ? 'Added' : 'Compare') : on ? 'In comparison' : 'Add to compare'}
      <span className="visually-hidden"> {project.name}</span>
    </button>
  );
}
