import type { Correction, Lead, Project } from '../types';

export class StorageUnavailableError extends Error {
  constructor() {
    super('No database is configured for this deployment.');
  }
}

export interface Repo {
  listProjects(opts?: { includeUnpublished?: boolean }): Promise<Project[]>;
  getProjectBySlug(slug: string, opts?: { includeUnpublished?: boolean }): Promise<Project | undefined>;
  saveProject(p: Project): Promise<void>;
  deleteProject(id: string): Promise<void>;
  addLead(l: Lead): Promise<{ duplicate: boolean }>;
  listLeads(): Promise<Lead[]>;
  updateLeadStatus(id: string, status: Lead['status']): Promise<void>;
  addCorrection(c: Correction): Promise<void>;
  listCorrections(): Promise<Correction[]>;
  updateCorrectionStatus(id: string, status: Correction['status']): Promise<void>;
}

