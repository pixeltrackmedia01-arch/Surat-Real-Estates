import 'server-only';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { Correction, Lead, Project } from '../types';
import type { Repo } from './base';
import { seedProjects } from './seed';

/**
 * DEVELOPMENT ADAPTER. Stores data as JSON under ./.data (git-ignored).
 * Nothing written here is sent anywhere. The UI labels results from this adapter as
 * "stored locally (development) — not sent".
 */
const DIR = path.join(process.cwd(), '.data');
const file = (name: string) => path.join(DIR, name);

async function read<T>(name: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(file(name), 'utf8')) as T;
  } catch {
    return fallback;
  }
}
async function write(name: string, data: unknown) {
  await fs.mkdir(DIR, { recursive: true });
  const tmp = file(`${name}.tmp`);
  await fs.writeFile(tmp, JSON.stringify(data, null, 2));
  await fs.rename(tmp, file(name));
}

/** Projects = seed overlaid with local admin edits (by id). */
async function allProjects(): Promise<Project[]> {
  const overrides = await read<Record<string, Project | null>>('projects.local.json', {});
  const map = new Map(seedProjects.map((p) => [p.id, p]));
  for (const [id, p] of Object.entries(overrides)) {
    if (p === null) map.delete(id);
    else map.set(id, p);
  }
  return [...map.values()];
}

export const localRepo: Repo = {
  async listProjects(opts) {
    const all = await allProjects();
    return opts?.includeUnpublished ? all : all.filter((p) => p.publication === 'published');
  },
  async getProjectBySlug(slug, opts) {
    const p = (await allProjects()).find((x) => x.slug === slug);
    if (!p) return undefined;
    return opts?.includeUnpublished || p.publication === 'published' ? p : undefined;
  },
  async saveProject(p) {
    const o = await read<Record<string, Project | null>>('projects.local.json', {});
    o[p.id] = p;
    await write('projects.local.json', o);
  },
  async deleteProject(id) {
    const o = await read<Record<string, Project | null>>('projects.local.json', {});
    o[id] = null;
    await write('projects.local.json', o);
  },
  async addLead(l) {
    const leads = await read<Lead[]>('leads.local.json', []);
    if (leads.some((x) => x.idempotencyKey === l.idempotencyKey)) return { duplicate: true };
    leads.unshift(l);
    await write('leads.local.json', leads);
    return { duplicate: false };
  },
  async listLeads() {
    return read<Lead[]>('leads.local.json', []);
  },
  async updateLeadStatus(id, status) {
    const leads = await read<Lead[]>('leads.local.json', []);
    await write('leads.local.json', leads.map((l) => (l.id === id ? { ...l, status } : l)));
  },
  async addCorrection(c) {
    const list = await read<Correction[]>('corrections.local.json', []);
    list.unshift(c);
    await write('corrections.local.json', list);
  },
  async listCorrections() {
    return read<Correction[]>('corrections.local.json', []);
  },
  async updateCorrectionStatus(id, status) {
    const list = await read<Correction[]>('corrections.local.json', []);
    await write('corrections.local.json', list.map((c) => (c.id === id ? { ...c, status } : c)));
  },
};
