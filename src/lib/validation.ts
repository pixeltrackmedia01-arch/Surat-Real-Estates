import { z } from 'zod';

/** Indian mobile: optional +91 / 0 prefix, then 10 digits starting 6-9. */
export const INDIAN_MOBILE = /^(?:\+?91[\s-]?|0)?[6-9]\d{9}$/;
export const normaliseMobile = (m: string) => {
  const digits = m.replace(/[\s-]/g, '');
  const ten = digits.slice(-10);
  return `+91${ten}`;
};

export const leadSchema = z.object({
  projectId: z.string().max(120).nullable(),
  sourcePath: z.string().max(300),
  name: z.string().trim().min(2, 'Please enter your name').max(80),
  mobile: z
    .string()
    .trim()
    .refine((v) => INDIAN_MOBILE.test(v.replace(/[\s-]/g, '')), 'Enter a 10-digit Indian mobile number'),
  budget: z.string().max(40).optional().default(''),
  visitPreference: z.enum(['weekday', 'weekend', 'call-first', 'any']).optional(),
  preferredDate: z
    .string()
    .optional()
    .refine((v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v), 'Choose a valid date'),
  message: z.string().max(1000).optional().default(''),
  consent: z.literal(true, { errorMap: () => ({ message: 'Please confirm consent to be contacted' }) }),
  idempotencyKey: z.string().min(8).max(80),
  // spam protection
  website: z.string().max(0).optional().default(''), // honeypot — must stay empty
  startedAt: z.number().int(),
});
export type LeadInput = z.infer<typeof leadSchema>;

export const correctionSchema = z.object({
  projectId: z.string().max(120).nullable(),
  sourcePath: z.string().max(300),
  field: z.string().max(80).optional(),
  details: z.string().trim().min(10, 'Please describe what is incorrect (at least 10 characters)').max(2000),
  evidenceUrl: z.string().url('Enter a full URL').max(500).optional().or(z.literal('')),
  submitterRole: z.enum(['visitor', 'developer', 'other']).optional(),
  contact: z.string().max(120).optional(),
  website: z.string().max(0).optional().default(''),
  startedAt: z.number().int(),
});

/* ---------------------------- Import schema ---------------------------- */
const provenance = z.enum(['sourced', 'developer', 'admin', 'inferred', 'unverified']);
const field = <T extends z.ZodTypeAny>(t: T) =>
  z.object({
    value: t,
    provenance,
    sourceId: z.string().optional(),
    checkedAt: z.string().optional(),
    note: z.string().optional(),
    conflict: z.any().optional(),
    flaggedForReview: z.boolean().optional(),
  });

export const mediaSchema = z.object({
  id: z.string(),
  type: z.enum(['image', 'floor_plan', 'model3d']),
  url: z.string().url(),
  previewUrl: z.string().url().optional(),
  alt: z.string().min(3),
  caption: z.string().optional(),
  label: z.string().optional(),
  attribution: z.string().min(2),
  sourceId: z.string(),
  permission: z.enum(['not_requested', 'requested', 'granted', 'denied']),
  permittedUse: z.string().optional(),
  illustrative: z.boolean().optional(),
  format: z.string().optional(),
  bytes: z.number().int().positive().max(25 * 1024 * 1024, '3D/media files must be 25 MB or smaller').optional(),
}).superRefine((m, ctx) => {
  if (m.permission === 'granted' && !m.permittedUse) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['permittedUse'], message: 'Record the permitted use before marking permission granted' });
  }
  if (m.type === 'model3d' && !/\.(glb|gltf)(\?|$)/i.test(m.url)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['url'], message: '3D models must be .glb or .gltf files' });
  }
});

export const projectSchema = z.object({
  id: z.string().min(3),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'slug: lowercase letters, digits and hyphens only'),
  name: z.string().min(2),
  developer: field(z.string()),
  type: z.literal('residential'),
  summary: field(z.string()).optional(),
  localityId: field(z.string()),
  address: field(z.string()).optional(),
  pinCodes: field(z.array(z.string().regex(/^\d{6}$/))),
  coordinates: field(z.object({ lat: z.number().min(20.9).max(21.4), lng: z.number().min(72.6).max(73.0) })).optional(),
  status: field(z.enum(['under_construction', 'completed', 'ready_to_move', 'possession_available', 'unverified'])),
  rera: field(z.object({ number: z.string(), url: z.string().url().optional(), approvedOn: z.string().optional() })).optional(),
  launchDate: field(z.string()).optional(),
  completionDate: field(z.string()).optional(),
  progress: field(z.object({ percent: z.number().min(0).max(100), asOf: z.string() })).optional(),
  price: field(
    z.object({
      kind: z.enum(['starting', 'range', 'on_request', 'not_provided']),
      min: z.number().positive().optional(),
      max: z.number().positive().optional(),
      unit: z.enum(['total', 'per_sq_ft']).optional(),
      currency: z.literal('INR'),
      qualification: z.string().optional(),
    }),
  ),
  configurations: field(z.array(z.string())),
  areas: field(
    z.array(
      z.object({
        kind: z.enum(['carpet', 'built_up', 'super_built_up']),
        min: z.number().positive().optional(),
        max: z.number().positive().optional(),
        unit: z.enum(['sq_ft', 'sq_m']),
        configuration: z.string().optional(),
      }),
    ),
  ),
  unitsTotal: field(z.number().int().positive()).optional(),
  blocks: field(z.number().int().positive()).optional(),
  amenities: field(z.array(z.string())).optional(),
  media: z.array(mediaSchema).default([]),
  sources: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        url: z.string().url().optional(),
        kind: z.enum(['rera', 'rera_mirror', 'developer', 'government', 'other', 'submission']),
        checkedAt: z.string(),
        state: z.enum(['ok', 'stale', 'unavailable']),
        note: z.string().optional(),
      }),
    )
    .min(1, 'Every project needs at least one source record'),
  createdAt: z.string(),
  updatedAt: z.string(),
  lastReviewedAt: z.string().optional(),
  publication: z.enum(['draft', 'published', 'needs_review', 'archived']),
  dataQuality: z.enum(['source_checked', 'third_party_source', 'has_conflicts', 'incomplete']),
  reviewNotes: z.string().optional(),
});
