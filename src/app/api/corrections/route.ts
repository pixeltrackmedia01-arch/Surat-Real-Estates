import { NextResponse } from 'next/server';
import { correctionSchema } from '@/lib/validation';
import { repo, storageMode } from '@/lib/repo';
import { clientKey, rateLimit } from '@/lib/ratelimit';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const mode = storageMode();
  if (mode === 'none') {
    return NextResponse.json(
      { stored: 'none', message: 'Corrections cannot be received online yet, so nothing was saved.' },
      { status: 503 },
    );
  }
  if (!rateLimit(`corr:${clientKey(req)}`, 8)) {
    return NextResponse.json({ message: 'Too many reports. Please try again later.' }, { status: 429 });
  }
  const parsed = correctionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
    return NextResponse.json({ message: 'Please check the form.', fieldErrors }, { status: 400 });
  }
  const d = parsed.data;
  if (d.website || Date.now() - d.startedAt < 2000) {
    return NextResponse.json({ message: 'Your report could not be accepted.' }, { status: 422 });
  }
  try {
    await repo().addCorrection({
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      projectId: d.projectId,
      sourcePath: d.sourcePath,
      field: d.field,
      details: d.details,
      evidenceUrl: d.evidenceUrl || undefined,
      submitterRole: d.submitterRole,
      contact: d.contact,
      status: 'open',
    });
    return NextResponse.json({ stored: mode }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ message: 'Could not save your report. It was not sent.' }, { status: 500 });
  }
}
