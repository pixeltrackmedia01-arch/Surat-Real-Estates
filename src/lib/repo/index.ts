import 'server-only';
import type { Project, StorageMode } from '../types';
import type { Repo } from './base';
import { localRepo } from './local';
import { supabaseRepo } from './supabase';
import { seedRepo } from './seed';

/**
 * Storage selection (server-side only):
 *   - SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY set  -> 'supabase'
 *   - otherwise, NODE_ENV !== 'production'          -> 'local-dev'  (writes to ./.data, clearly labelled)
 *   - otherwise                                     -> 'none'       (read-only bundled seed; writes refused)
 *
 * A production deployment never silently falls back to local files.
 */
export function storageMode(): StorageMode {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) return 'supabase';
  if (process.env.NODE_ENV !== 'production') return 'local-dev';
  return 'none';
}

export { StorageUnavailableError } from './base';
export type { Repo } from './base';

export function repo(): Repo {
  switch (storageMode()) {
    case 'supabase':
      return supabaseRepo();
    case 'local-dev':
      return localRepo;
    default:
      return seedRepo;
  }
}

export async function publishedProjects(): Promise<Project[]> {
  return repo().listProjects();
}
