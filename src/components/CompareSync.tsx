'use client';

import { useEffect } from 'react';
import { type ProjectRef, useApp } from './Providers';

/** Keeps the stored selection in step with a shared /compare?ids= URL. */
export function CompareSync({ ids, refs }: { ids: string[]; refs: ProjectRef[] }) {
  const { compare, clearCompare, toggleCompare } = useApp();
  useEffect(() => {
    if (!ids.length) return;
    const same = compare.length === ids.length && compare.every((c) => ids.includes(c.id));
    if (same) return;
    clearCompare();
    refs.forEach((r) => toggleCompare(r));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids.join(',')]);
  return null;
}
