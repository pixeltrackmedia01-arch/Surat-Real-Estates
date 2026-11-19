import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Correction, Lead, Project } from '../types';
import type { Repo } from './base';

/**
 * Production adapter (PostgreSQL via Supabase). Uses the service-role key, which must only
 * ever exist in server environment variables. Schema: supabase/migrations/0001_init.sql.
 */
let client: SupabaseClient | null = null;
function db(): SupabaseClient {
  if (!client) {
    client = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

function fail(error: { message: string } | null) {
  if (error) throw new Error(`Database error: ${error.message}`);
}

const projectRow = (p: Project) => ({
  id: p.id,
  slug: p.slug,
  name: p.name,
  developer_name: p.developer.value,
  locality_id: p.localityId.value,
  rera_number: p.rera?.value.number ?? null,
  status: p.status.value,
  publication: p.publication,
  data_quality: p.dataQuality,
  updated_at: p.updatedAt,
  last_reviewed_at: p.lastReviewedAt ?? null,
  doc: p,
});

const leadRow = (l: Lead) => ({
  id: l.id,
  created_at: l.createdAt,
  project_id: l.projectId,
  project_name: l.projectName ?? null,
  source_path: l.sourcePath,
  name: l.name,
  mobile: l.mobile,
  budget: l.budget ?? null,
  visit_preference: l.visitPreference ?? null,
  preferred_date: l.preferredDate || null,
  message: l.message ?? null,
  consent: l.consent,
  idempotency_key: l.idempotencyKey,
  status: l.status,
});
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rowLead = (r: any): Lead => ({
  id: r.id,
  createdAt: r.created_at,
  projectId: r.project_id,
  projectName: r.project_name ?? undefined,
  sourcePath: r.source_path,
  name: r.name,
  mobile: r.mobile,
  budget: r.budget ?? undefined,
  visitPreference: r.visit_preference ?? undefined,
  preferredDate: r.preferred_date ?? undefined,
  message: r.message ?? undefined,
  consent: true,
  idempotencyKey: r.idempotency_key,
  status: r.status,
});

export function supabaseRepo(): Repo {
  return {
    async listProjects(opts) {
      let q = db().from('projects').select('doc');
      if (!opts?.includeUnpublished) q = q.eq('publication', 'published');
      const { data, error } = await q.order('updated_at', { ascending: false });
      fail(error);
      return (data ?? []).map((r) => r.doc as Project);
    },
    async getProjectBySlug(slug, opts) {
      let q = db().from('projects').select('doc').eq('slug', slug);
      if (!opts?.includeUnpublished) q = q.eq('publication', 'published');
      const { data, error } = await q.maybeSingle();
      fail(error);
      return (data?.doc as Project) ?? undefined;
    },
    async saveProject(p) {
      const { error } = await db().from('projects').upsert(projectRow(p));
      fail(error);
      await db().from('audit_log').insert({ entity: 'project', entity_id: p.id, action: 'save', detail: { publication: p.publication } });
    },
    async deleteProject(id) {
      const { error } = await db().from('projects').delete().eq('id', id);
      fail(error);
      await db().from('audit_log').insert({ entity: 'project', entity_id: id, action: 'delete' });
    },
    async addLead(l) {
      const { error } = await db().from('leads').insert(leadRow(l));
      if (error && /duplicate key/i.test(error.message)) return { duplicate: true };
      fail(error);
      return { duplicate: false };
    },
    async listLeads() {
      const { data, error } = await db().from('leads').select('*').order('created_at', { ascending: false }).limit(500);
      fail(error);
      return (data ?? []).map(rowLead);
    },
    async updateLeadStatus(id, status) {
      const { error } = await db().from('leads').update({ status }).eq('id', id);
      fail(error);
    },
    async addCorrection(c: Correction) {
      const { error } = await db().from('corrections').insert({
        id: c.id,
        created_at: c.createdAt,
        project_id: c.projectId,
        source_path: c.sourcePath,
        field: c.field ?? null,
        details: c.details,
        evidence_url: c.evidenceUrl ?? null,
        submitter_role: c.submitterRole ?? null,
        contact: c.contact ?? null,
        status: c.status,
      });
      fail(error);
    },
    async listCorrections() {
      const { data, error } = await db().from('corrections').select('*').order('created_at', { ascending: false }).limit(500);
      fail(error);
      return (data ?? []).map((r) => ({
        id: r.id,
        createdAt: r.created_at,
        projectId: r.project_id,
        sourcePath: r.source_path,
        field: r.field ?? undefined,
        details: r.details,
        evidenceUrl: r.evidence_url ?? undefined,
        submitterRole: r.submitter_role ?? undefined,
        contact: r.contact ?? undefined,
        status: r.status,
      }));
    },
    async updateCorrectionStatus(id, status) {
      const { error } = await db().from('corrections').update({ status }).eq('id', id);
      fail(error);
    },
  };
}
