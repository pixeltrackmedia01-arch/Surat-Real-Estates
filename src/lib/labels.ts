import type { AreaKind, DataQuality, GeoConfidence, ProjectStatus, ProvenanceKind, PublicationState } from './types';

export const STATUS_LABEL: Record<ProjectStatus, string> = {
  under_construction: 'Under construction',
  completed: 'Completed',
  ready_to_move: 'Ready to move',
  possession_available: 'Possession available',
  unverified: 'Status unverified',
};

export const STATUS_FILTERS: { value: ProjectStatus; label: string }[] = [
  { value: 'under_construction', label: 'Under construction' },
  { value: 'completed', label: 'Completed' },
  { value: 'ready_to_move', label: 'Ready to move' },
  { value: 'possession_available', label: 'Possession available' },
  { value: 'unverified', label: 'Status unverified' },
];

/** Neutral, accurate badges. Never implies developer confirmation unless provenance is 'developer'. */
export const PROVENANCE_LABEL: Record<ProvenanceKind, string> = {
  sourced: 'Source-reported',
  developer: 'Developer-provided',
  admin: 'Admin-entered',
  inferred: 'Inferred — not verified',
  unverified: 'Unverified',
};

export const QUALITY_LABEL: Record<DataQuality, { label: string; tone: 'ok' | 'info' | 'warn' }> = {
  source_checked: { label: 'Source checked', tone: 'ok' },
  third_party_source: { label: 'Third-party source', tone: 'info' },
  has_conflicts: { label: 'Conflicting source data', tone: 'warn' },
  incomplete: { label: 'Incomplete record', tone: 'warn' },
};

export const GEO_CONFIDENCE_LABEL: Record<GeoConfidence, string> = {
  source_indicated: 'Named in an SMC source',
  inferred: 'Inferred — needs verification',
  unverified: 'Not established',
};

export const AREA_LABEL: Record<AreaKind, string> = {
  carpet: 'Carpet area',
  built_up: 'Built-up area',
  super_built_up: 'Super built-up area',
};

export const PUBLICATION_LABEL: Record<PublicationState, string> = {
  draft: 'Draft',
  published: 'Published',
  needs_review: 'Needs review',
  archived: 'Archived',
};

export const BHK_OPTIONS = ['1 BHK', '2 BHK', '3 BHK', '4 BHK', '5+ BHK'];

/** Budget bands in INR (total price). */
export const BUDGET_BANDS: { id: string; label: string; min?: number; max?: number }[] = [
  { id: 'u50l', label: 'Under ₹50 L', max: 50_00_000 },
  { id: '50l-1cr', label: '₹50 L – ₹1 Cr', min: 50_00_000, max: 1_00_00_000 },
  { id: '1-2cr', label: '₹1 – 2 Cr', min: 1_00_00_000, max: 2_00_00_000 },
  { id: '2-4cr', label: '₹2 – 4 Cr', min: 2_00_00_000, max: 4_00_00_000 },
  { id: 'o4cr', label: 'Above ₹4 Cr', min: 4_00_00_000 },
];
