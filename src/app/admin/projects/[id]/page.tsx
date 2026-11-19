import { notFound } from 'next/navigation';
import { repo } from '@/lib/repo';
import { localities } from '@/lib/geo';
import type { Project } from '@/lib/types';
import { ProjectEditor } from './ProjectEditor';

type Params = Promise<{ id: string }>;

function blank(): Project {
  const now = new Date().toISOString();
  const today = now.slice(0, 10);
  return {
    id: '',
    slug: '',
    name: '',
    developer: { value: '', provenance: 'sourced', sourceId: 'src-1', checkedAt: today },
    type: 'residential',
    localityId: { value: '', provenance: 'sourced', sourceId: 'src-1', checkedAt: today },
    pinCodes: { value: [], provenance: 'unverified' },
    status: { value: 'unverified', provenance: 'unverified' },
    price: { value: { kind: 'not_provided', currency: 'INR' }, provenance: 'unverified' },
    configurations: { value: [], provenance: 'unverified' },
    areas: { value: [], provenance: 'unverified' },
    media: [],
    sources: [{ id: 'src-1', name: '', kind: 'rera', checkedAt: today, state: 'ok' }],
    createdAt: now,
    updatedAt: now,
    publication: 'draft',
    dataQuality: 'incomplete',
  };
}

export default async function EditProject({ params }: { params: Params }) {
  const id = decodeURIComponent((await params).id);
  const all = await repo().listProjects({ includeUnpublished: true });
  const project = id === 'new' ? blank() : all.find((p) => p.id === id);
  if (!project) notFound();
  return (
    <ProjectEditor
      initial={project}
      isNew={id === 'new'}
      localities={localities.map((l) => ({ id: l.id, name: l.name })).sort((a, b) => a.name.localeCompare(b.name))}
    />
  );
}
