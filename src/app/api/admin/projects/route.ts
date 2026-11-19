import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { repo, StorageUnavailableError } from '@/lib/repo';
import { projectSchema } from '@/lib/validation';
import { findDuplicates, mergeProjects } from '@/lib/dedupe';
import { validateImport } from '@/lib/importer';
import type { Project } from '@/lib/types';

export const dynamic = 'force-dynamic';

const unavailable = () =>
  NextResponse.json(
    { message: 'No database is configured for this deployment, so changes cannot be saved. Configure Supabase (see README) or work in local development.' },
    { status: 503 },
  );

function refresh(p?: Project) {
  revalidatePath('/');
  revalidatePath('/projects');
  if (p) revalidatePath(`/projects/${p.slug}`);
}

/** POST { action: 'save' | 'delete' | 'merge' | 'import', ... } */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.action) return NextResponse.json({ message: 'Missing action' }, { status: 400 });
  const r = repo();
  try {
    if (body.action === 'save') {
      const parsed = projectSchema.safeParse(body.project);
      if (!parsed.success) {
        return NextResponse.json({ message: 'Validation failed', errors: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`) }, { status: 400 });
      }
      const p = { ...(parsed.data as Project), updatedAt: new Date().toISOString() };
      if (body.markReviewed) p.lastReviewedAt = p.updatedAt;
      const all = await r.listProjects({ includeUnpublished: true });
      const dups = findDuplicates(p, all);
      await r.saveProject(p);
      refresh(p);
      return NextResponse.json({ ok: true, project: p, duplicates: dups.map((d) => ({ id: d.existing.id, name: d.existing.name, reason: d.reason })) });
    }
    if (body.action === 'delete') {
      await r.deleteProject(String(body.id));
      refresh();
      return NextResponse.json({ ok: true });
    }
    if (body.action === 'merge') {
      const all = await r.listProjects({ includeUnpublished: true });
      const a = all.find((p) => p.id === body.primaryId);
      const b = all.find((p) => p.id === body.secondaryId);
      if (!a || !b || a.id === b.id) return NextResponse.json({ message: 'Choose two different existing projects.' }, { status: 400 });
      const merged = mergeProjects(a, b);
      await r.saveProject(merged);
      await r.saveProject({ ...b, publication: 'archived', updatedAt: merged.updatedAt, reviewNotes: `Merged into ${a.id}` });
      refresh(merged);
      return NextResponse.json({ ok: true, project: merged });
    }
    if (body.action === 'import') {
      const existing = await r.listProjects({ includeUnpublished: true });
      const results = validateImport(body.format === 'csv' ? { format: 'csv', text: String(body.text ?? '') } : { format: 'json', data: body.data }, existing);
      if (!body.dryRun) {
        for (const res of results) {
          // Rows with a certain duplicate are held back unless explicitly allowed.
          if (res.ok && res.project && !(res.duplicates.some((d) => d.strength === 'certain') && !body.allowDuplicates)) {
            await r.saveProject(res.project);
          }
        }
        refresh();
      }
      return NextResponse.json({ ok: true, dryRun: !!body.dryRun, results: results.map(({ project, ...x }) => ({ ...x, id: project?.id })) });
    }
    return NextResponse.json({ message: 'Unknown action' }, { status: 400 });
  } catch (e) {
    if (e instanceof StorageUnavailableError) return unavailable();
    console.error(e);
    return NextResponse.json({ message: e instanceof Error ? e.message : 'Failed' }, { status: 500 });
  }
}
