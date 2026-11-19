/**
 * Core data model for Surat residential project discovery.
 *
 * Design rules encoded here:
 *  - Every important fact carries provenance (where it came from, when it was checked).
 *  - Area values always declare their measurement type; they are never blended.
 *  - Prices declare whether they are a starting price, a range, on request, or absent.
 *  - Media cannot be displayed unless permission is recorded as granted.
 */

export type ProvenanceKind =
  | 'sourced' // taken from a cited public source
  | 'developer' // supplied by the developer / promoter
  | 'admin' // entered by an administrator
  | 'inferred' // derived by us from other evidence — must be shown as such
  | 'unverified'; // known claim that has not been checked

export interface Conflict<T> {
  values: { value: T; sourceId: string; note?: string }[];
  note?: string;
}

export interface Field<T> {
  value: T;
  provenance: ProvenanceKind;
  sourceId?: string;
  checkedAt?: string; // ISO date
  note?: string;
  conflict?: Conflict<T>;
  flaggedForReview?: boolean;
}

export type SourceKind = 'rera' | 'rera_mirror' | 'developer' | 'government' | 'other' | 'submission';
export type SourceState = 'ok' | 'stale' | 'unavailable';

export interface SourceRecord {
  id: string;
  name: string;
  url?: string;
  kind: SourceKind;
  checkedAt: string; // ISO date
  state: SourceState;
  note?: string;
}

export type ProjectStatus =
  | 'under_construction'
  | 'completed'
  | 'ready_to_move'
  | 'possession_available'
  | 'unverified';

export type PublicationState = 'draft' | 'published' | 'needs_review' | 'archived';

export type DataQuality =
  | 'source_checked' // facts match a cited source as of checkedAt
  | 'third_party_source' // facts come from a secondary/aggregator source
  | 'has_conflicts' // at least one field has an unresolved conflict
  | 'incomplete';

export type AreaKind = 'carpet' | 'built_up' | 'super_built_up';
export type AreaUnit = 'sq_ft' | 'sq_m';

export interface AreaValue {
  kind: AreaKind;
  min?: number;
  max?: number;
  unit: AreaUnit;
  configuration?: string; // e.g. "3 BHK"
}

export type PriceKind = 'starting' | 'range' | 'on_request' | 'not_provided';

export interface Price {
  kind: PriceKind;
  min?: number;
  max?: number;
  unit?: 'total' | 'per_sq_ft';
  currency: 'INR';
  qualification?: string; // e.g. "excl. registration and GST"
}

export type MediaType = 'image' | 'floor_plan' | 'model3d';
export type MediaPermission = 'not_requested' | 'requested' | 'granted' | 'denied';

export interface MediaAsset {
  id: string;
  type: MediaType;
  url: string;
  previewUrl?: string; // static preview for 3D
  alt: string;
  caption?: string;
  label?: string; // floor plan label, e.g. "3 BHK — Type A"
  attribution: string;
  sourceId: string;
  permission: MediaPermission;
  permittedUse?: string;
  illustrative?: boolean; // true for renders / reconstructed models
  format?: string; // e.g. "glb", "webp"
  bytes?: number;
}

export interface Project {
  id: string; // stable internal id
  slug: string;
  name: string;
  developer: Field<string>; // developer / promoter name
  type: 'residential';
  summary?: Field<string>;
  localityId: Field<string>;
  address?: Field<string>;
  pinCodes: Field<string[]>;
  coordinates?: Field<{ lat: number; lng: number }>;
  status: Field<ProjectStatus>;
  rera?: Field<{ number: string; url?: string; approvedOn?: string }>;
  launchDate?: Field<string>;
  completionDate?: Field<string>; // declared / proposed completion or possession
  progress?: Field<{ percent: number; asOf: string }>;
  price: Field<Price>;
  configurations: Field<string[]>; // e.g. ["3 BHK", "4 BHK"]
  areas: Field<AreaValue[]>;
  unitsTotal?: Field<number>;
  blocks?: Field<number>;
  amenities?: Field<string[]>;
  media: MediaAsset[];
  sources: SourceRecord[];
  createdAt: string;
  updatedAt: string;
  lastReviewedAt?: string;
  publication: PublicationState;
  dataQuality: DataQuality;
  reviewNotes?: string;
}

/* ----------------------------- Geography ----------------------------- */

export type GeoConfidence = 'source_indicated' | 'inferred' | 'unverified';

export interface Zone {
  id: string;
  name: string; // official SMC name
  formerNames: string[]; // names seen in older SMC documents
  officeLocality?: string;
  sourceIds: string[];
}

export interface Locality {
  id: string;
  name: string;
  aliases: string[];
  zoneId: string | null;
  zoneConfidence: GeoConfidence;
  zoneEvidence?: string; // short explanation of the evidence
  pinCodes: string[];
  pinConfidence: GeoConfidence;
  sourceIds: string[];
  lat?: number; // only when reliably sourced
  lng?: number;
  note?: string;
}

export interface PostOffice {
  office: string;
  pin: string;
  officeType: string;
  delivery: string;
  division: string;
  localityIds: string[];
  scope: 'city_linked' | 'unclassified';
}

export interface GeoSource {
  id: string;
  name: string;
  url: string;
  publisher: string;
  pageUpdated?: string;
  checkedAt: string;
  licence?: string;
  note?: string;
}

/* ------------------------------- Leads ------------------------------- */

export interface Lead {
  id: string;
  createdAt: string;
  projectId: string | null;
  projectName?: string;
  sourcePath: string;
  name: string;
  mobile: string;
  budget?: string;
  visitPreference?: string;
  preferredDate?: string;
  message?: string;
  consent: true;
  idempotencyKey: string;
  status: 'new' | 'contacted' | 'closed' | 'spam';
}

export interface Correction {
  id: string;
  createdAt: string;
  projectId: string | null;
  sourcePath: string;
  field?: string;
  details: string;
  evidenceUrl?: string;
  submitterRole?: 'visitor' | 'developer' | 'other';
  contact?: string;
  status: 'open' | 'resolved' | 'rejected';
}

export type StorageMode = 'supabase' | 'local-dev' | 'none';
