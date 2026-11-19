import { AlertTriangle, CircleDot, Info, ShieldCheck } from 'lucide-react';
import type { DataQuality, Field, ProjectStatus } from '@/lib/types';
import { PROVENANCE_LABEL, QUALITY_LABEL, STATUS_LABEL } from '@/lib/labels';

export function StatusBadge({ status }: { status: Field<ProjectStatus> }) {
  const s = status.value;
  const conflicted = !!status.conflict;
  const tone = s === 'unverified' || conflicted ? 'badge-warn' : s === 'under_construction' ? 'badge-line' : 'badge-ink';
  return (
    <span className={`badge ${tone}`}>
      {s === 'unverified' || conflicted ? <AlertTriangle size={12} aria-hidden="true" /> : <CircleDot size={12} aria-hidden="true" />}
      {STATUS_LABEL[s]}
      {s !== 'unverified' && status.provenance === 'sourced' && <span className="visually-hidden"> (source-reported)</span>}
    </span>
  );
}

export function QualityBadge({ quality }: { quality: DataQuality }) {
  const q = QUALITY_LABEL[quality];
  const Icon = q.tone === 'ok' ? ShieldCheck : q.tone === 'warn' ? AlertTriangle : Info;
  return (
    <span className={`badge badge-${q.tone}`}>
      <Icon size={12} aria-hidden="true" />
      {q.label}
    </span>
  );
}

/** Small inline marker next to a value showing where it came from. */
export function Prov({ field }: { field?: Pick<Field<unknown>, 'provenance' | 'note' | 'conflict'> }) {
  if (!field) return null;
  const label = field.conflict ? 'Conflicting sources' : PROVENANCE_LABEL[field.provenance];
  return (
    <span className={`prov prov-${field.conflict ? 'conflict' : field.provenance}`} title={field.note}>
      {label}
    </span>
  );
}
