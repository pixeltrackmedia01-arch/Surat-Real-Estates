import { NextResponse } from 'next/server';
import { leadSchema, normaliseMobile } from '@/lib/validation';
import { repo, storageMode } from '@/lib/repo';
import { clientKey, rateLimit } from '@/lib/ratelimit';
import type { Lead } from '@/lib/types';

export const dynamic = 'force-dynamic';

/**
 * POST /api/leads
 * Responses state exactly where the enquiry went:
 *   201 { stored: 'supabase' }   — saved in the production database (private; admins only)
 *   201 { stored: 'local-dev' }  — development only, written to ./.data — NOT sent
 *   503 { stored: 'none' }       — no database configured; the enquiry was NOT saved or sent
 */
export async function POST(req: Request) {
  const mode = storageMode();
  if (mode === 'none') {
    return NextResponse.json(
      {
        stored: 'none',
        message:
          'Online enquiries are not yet connected on this site, so nothing was saved or sent. Please try again later.',
      },
      { status: 503 },
    );
  }
  if (!rateLimit(`lead:${clientKey(req)}`, 6)) {
    return NextResponse.json({ message: 'Too many enquiries from this connection. Please try again in a few minutes.' }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = leadSchema.safeParse(body);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
    return NextResponse.json({ message: 'Please check the highlighted fields.', fieldErrors }, { status: 400 });
  }
  const d = parsed.data;

  // Spam heuristics: filled honeypot, or submitted implausibly fast. Respond like success-less refusal.
  if (d.website || Date.now() - d.startedAt < 2500) {
    return NextResponse.json({ message: 'Your enquiry could not be accepted. Please try again.' }, { status: 422 });
  }

  const r = repo();
  let projectName: string | undefined;
  if (d.projectId) {
    const all = await r.listProjects();
    const p = all.find((x) => x.id === d.projectId);
    if (!p) return NextResponse.json({ message: 'Unknown project.' }, { status: 400 });
    projectName = p.name;
  }

  const lead: Lead = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    projectId: d.projectId,
    projectName,
    sourcePath: d.sourcePath,
    name: d.name,
    mobile: normaliseMobile(d.mobile),
    budget: d.budget || undefined,
    visitPreference: d.visitPreference,
    preferredDate: d.preferredDate || undefined,
    message: d.message || undefined,
    consent: true,
    idempotencyKey: d.idempotencyKey,
    status: 'new',
  };

  try {
    const { duplicate } = await r.addLead(lead);
    return NextResponse.json({ stored: mode, duplicate }, { status: 201 });
  } catch (e) {
    console.error('lead store failed', e);
    return NextResponse.json({ message: 'We could not save your enquiry. It was not sent — please try again.' }, { status: 500 });
  }
}
