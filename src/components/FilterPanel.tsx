'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SlidersHorizontal, X } from 'lucide-react';
import type { Filters } from '@/lib/search';
import { filtersToQuery } from '@/lib/search';
import { localities, zones } from '@/lib/geo';
import { BHK_OPTIONS, BUDGET_BANDS, STATUS_FILTERS } from '@/lib/labels';

/**
 * Filter form. Without JS it is a plain GET form; with JS it applies on change and on mobile
 * opens as a bottom sheet. All state lives in the URL so filtered searches are shareable.
 */
export function FilterPanel({ filters, total, hasAreaData }: { filters: Filters; total: number; hasAreaData: boolean }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const sheetRef = useRef<HTMLDialogElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 899px)');
    const on = () => setIsMobile(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  const apply = () => {
    const fd = new FormData(formRef.current!);
    const f: Partial<Filters> = {
      q: String(fd.get('q') ?? ''),
      loc: fd.getAll('loc').map(String).filter(Boolean),
      zone: String(fd.get('zone') ?? ''),
      bhk: fd.getAll('bhk').map(String),
      budget: String(fd.get('budget') ?? ''),
      status: fd.getAll('status').map(String) as Filters['status'],
      possession: String(fd.get('possession') ?? ''),
      amin: Number(fd.get('amin')) || undefined,
      amax: Number(fd.get('amax')) || undefined,
      atype: (String(fd.get('atype') || 'carpet') as Filters['atype']),
      sort: filters.sort,
    };
    router.replace(`/projects${filtersToQuery(f)}`, { scroll: false });
  };
  const onChange = () => {
    if (!isMobile) apply();
  };

  const years = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() + i);
  const sortedLocs = [...localities].sort((a, b) => a.name.localeCompare(b.name));

  const form = (
    <form
      key={filtersToQuery(filters)}
      ref={formRef}
      method="get"
      action="/projects"
      className="filters"
      onChange={onChange}
      onSubmit={(e) => {
        e.preventDefault();
        apply();
        sheetRef.current?.close();
      }}
      aria-label="Filter projects"
    >
      <input type="hidden" name="q" value={filters.q} />
      <div className="field">
        <label htmlFor="f-loc">Locality</label>
        <select id="f-loc" name="loc" className="select" defaultValue={filters.loc[0] ?? ''}>
          <option value="">All localities</option>
          {sortedLocs.map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>
        {filters.loc.slice(1).map((id) => (
          <input key={id} type="hidden" name="loc" value={id} />
        ))}
      </div>
      <div className="field">
        <label htmlFor="f-zone">SMC zone</label>
        <select id="f-zone" name="zone" className="select" defaultValue={filters.zone}>
          <option value="">All zones</option>
          {zones.map((z) => (
            <option key={z.id} value={z.id}>{z.name}</option>
          ))}
        </select>
      </div>
      <fieldset className="field fieldset">
        <legend>BHK</legend>
        <div className="checkchips">
          {BHK_OPTIONS.map((b) => (
            <label key={b} className="checkchip">
              <input type="checkbox" name="bhk" value={b} defaultChecked={filters.bhk.includes(b)} />
              <span>{b}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="field">
        <label htmlFor="f-budget">Budget (total price)</label>
        <select id="f-budget" name="budget" className="select" defaultValue={filters.budget}>
          <option value="">Any budget</option>
          {BUDGET_BANDS.map((b) => (
            <option key={b.id} value={b.id}>{b.label}</option>
          ))}
        </select>
        <span className="field-hint">Projects without a sourced price are excluded when a budget is set.</span>
      </div>
      <fieldset className="field fieldset">
        <legend>Status</legend>
        <div className="checklist">
          {STATUS_FILTERS.map((s) => (
            <label key={s.value} className="check">
              <input type="checkbox" name="status" value={s.value} defaultChecked={filters.status.includes(s.value)} />
              <span>{s.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="field">
        <label htmlFor="f-pos">Possession timing</label>
        <select id="f-pos" name="possession" className="select" defaultValue={filters.possession}>
          <option value="">Any time</option>
          <option value="ready">Completed / ready now</option>
          {years.map((y) => (
            <option key={y} value={y}>Proposed completion by {y}</option>
          ))}
        </select>
        <span className="field-hint">Based on declared completion dates — not a possession guarantee.</span>
      </div>
      <fieldset className="field fieldset">
        <legend>Area</legend>
        <select name="atype" className="select" defaultValue={filters.atype} aria-label="Area type">
          <option value="carpet">Carpet area</option>
          <option value="built_up">Built-up area</option>
          <option value="super_built_up">Super built-up area</option>
        </select>
        <div className="range">
          <input name="amin" className="input" inputMode="numeric" placeholder="Min sq ft" defaultValue={filters.amin ?? ''} aria-label="Minimum area in square feet" />
          <span aria-hidden="true">–</span>
          <input name="amax" className="input" inputMode="numeric" placeholder="Max sq ft" defaultValue={filters.amax ?? ''} aria-label="Maximum area in square feet" />
        </div>
        {!hasAreaData && <span className="field-hint">No listed project has sourced unit areas yet.</span>}
      </fieldset>
      <div className="filters__foot">
        <a href="/projects" className="linklike small">Clear all</a>
        <button type="submit" className="btn btn-ink btn-sm filters__apply">
          {isMobile ? `Show results` : 'Apply'}
        </button>
      </div>
    </form>
  );

  return (
    <>
      <button
        type="button"
        className="btn btn-ink filters-fab"
        onClick={() => sheetRef.current?.showModal()}
        aria-haspopup="dialog"
      >
        <SlidersHorizontal size={16} aria-hidden="true" /> Filters · {total} {total === 1 ? 'result' : 'results'}
      </button>
      {!isMobile && <aside className="filters-aside">{form}</aside>}
      {isMobile && (
        <dialog
          ref={sheetRef}
          className="sheet"
          aria-label="Filters"
          onClick={(e) => e.target === sheetRef.current && sheetRef.current?.close()}
        >
          <div className="sheet__panel">
            <div className="sheet__head">
              <h2 className="sheet__title">Filters</h2>
              <button type="button" className="icon-btn" onClick={() => sheetRef.current?.close()} aria-label="Close filters">
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            {form}
          </div>
        </dialog>
      )}
    </>
  );
}
