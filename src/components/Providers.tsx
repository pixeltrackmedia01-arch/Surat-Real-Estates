'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { LeadSheet } from './LeadSheet';
import { CompareTray } from './CompareTray';

export interface ProjectRef {
  id: string;
  slug: string;
  name: string;
  locality?: string;
}

interface Ctx {
  compare: ProjectRef[];
  toggleCompare: (p: ProjectRef) => void;
  removeCompare: (id: string) => void;
  clearCompare: () => void;
  openLead: (p: ProjectRef | null, intent?: 'visit' | 'details') => void;
}

export const MAX_COMPARE = 3;
const KEY = 'shi.compare.v1';
const AppCtx = createContext<Ctx | null>(null);

export function useApp() {
  const c = useContext(AppCtx);
  if (!c) throw new Error('useApp outside Providers');
  return c;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [compare, setCompare] = useState<ProjectRef[]>([]);
  const [lead, setLead] = useState<{ open: boolean; project: ProjectRef | null; intent: 'visit' | 'details' }>({
    open: false,
    project: null,
    intent: 'visit',
  });
  const [notice, setNotice] = useState('');

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setCompare(JSON.parse(raw).slice(0, MAX_COMPARE));
    } catch {
      /* storage unavailable — compare still works for this page view */
    }
  }, []);
  const persist = (next: ProjectRef[]) => {
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
    return next;
  };

  const toggleCompare = useCallback((p: ProjectRef) => {
    setCompare((cur) => {
      if (cur.some((x) => x.id === p.id)) {
        setNotice(`${p.name} removed from comparison.`);
        return persist(cur.filter((x) => x.id !== p.id));
      }
      if (cur.length >= MAX_COMPARE) {
        setNotice(`You can compare up to ${MAX_COMPARE} projects. Remove one first.`);
        return cur;
      }
      setNotice(`${p.name} added to comparison (${cur.length + 1} of ${MAX_COMPARE}).`);
      return persist([...cur, p]);
    });
  }, []);
  const removeCompare = useCallback((id: string) => setCompare((cur) => persist(cur.filter((x) => x.id !== id))), []);
  const clearCompare = useCallback(() => setCompare(persist([])), []);
  const openLead = useCallback(
    (project: ProjectRef | null, intent: 'visit' | 'details' = 'visit') => setLead({ open: true, project, intent }),
    [],
  );

  const value = useMemo(
    () => ({ compare, toggleCompare, removeCompare, clearCompare, openLead }),
    [compare, toggleCompare, removeCompare, clearCompare, openLead],
  );

  return (
    <AppCtx.Provider value={value}>
      {children}
      <CompareTray />
      <LeadSheet
        open={lead.open}
        project={lead.project}
        intent={lead.intent}
        onClose={() => setLead((l) => ({ ...l, open: false }))}
      />
      <div aria-live="polite" className="visually-hidden">
        {notice}
      </div>
    </AppCtx.Provider>
  );
}
