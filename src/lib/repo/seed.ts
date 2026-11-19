import 'server-only';
import seed from '@/data/projects.seed.json';
import type { Project } from '../types';
import type { Repo } from './base';
import { StorageUnavailableError } from './base';

export const seedProjects = seed as unknown as Project[];

const refuse = async (): Promise<never> => {
  throw new StorageUnavailableError();
};

/** Read-only repository used in production when no database is configured. */
export const seedRepo: Repo = {
  async listProjects(opts) {
    return opts?.includeUnpublished ? seedProjects : seedProjects.filter((p) => p.publication === 'published');
  },
  async getProjectBySlug(slug, opts) {
    const p = seedProjects.find((x) => x.slug === slug);
    if (!p) return undefined;
    return opts?.includeUnpublished || p.publication === 'published' ? p : undefined;
  },
  saveProject: refuse,
  deleteProject: refuse,
  addLead: refuse,
  async listLeads() {
    return [];
  },
  updateLeadStatus: refuse,
  addCorrection: refuse,
  async listCorrections() {
    return [];
  },
  updateCorrectionStatus: refuse,
};
