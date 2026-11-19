#!/usr/bin/env node
/**
 * Loads src/data/projects.seed.json into a Supabase database that already has
 * supabase/migrations/0001_init.sql applied.
 *
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-supabase.mjs
 *
 * Upserts by id, so it is safe to re-run. Admin edits made later in the database win only if you
 * do not re-run this script afterwards.
 */
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const projects = JSON.parse(fs.readFileSync(new URL('../src/data/projects.seed.json', import.meta.url), 'utf8'));
const rows = projects.map((p) => ({
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
}));
const { error } = await db.from('projects').upsert(rows);
if (error) {
  console.error(error.message);
  process.exit(1);
}
console.log(`Upserted ${rows.length} projects.`);
