import { NextResponse } from 'next/server';
import { repo, StorageUnavailableError } from '@/lib/repo';

export const dynamic = 'force-dynamic';

/** PATCH { kind: 'lead' | 'correction', id, status } */
export async function PATCH(req: Request) {
  const b = await req.json().catch(() => null);
  const r = repo();
  try {
    if (b?.kind === 'lead' && ['new', 'contacted', 'closed', 'spam'].includes(b.status)) await r.updateLeadStatus(String(b.id), b.status);
    else if (b?.kind === 'correction' && ['open', 'resolved', 'rejected'].includes(b.status)) await r.updateCorrectionStatus(String(b.id), b.status);
    else return NextResponse.json({ message: 'Invalid request' }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof StorageUnavailableError) return NextResponse.json({ message: 'No database configured.' }, { status: 503 });
    return NextResponse.json({ message: e instanceof Error ? e.message : 'Failed' }, { status: 500 });
  }
}
