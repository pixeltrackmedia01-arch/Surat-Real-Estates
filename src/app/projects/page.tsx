import type { Metadata } from 'next';
import Link from 'next/link';
import { X } from 'lucide-react';
import { publishedProjects } from '@/lib/repo';
import { filtersToQuery, parseFilters, searchProjects, type Filters } from '@/lib/search';
import { getLocality, getZone } from '@/lib/geo';
import { BUDGET_BANDS, STATUS_LABEL } from '@/lib/labels';
import { ProjectCard } from '@/components/ProjectCard';
import { FilterPanel } from '@/components/FilterPanel';
import { SortSelect } from '@/components/SortSelect';
import { SearchBox } from '@/components/SearchBox';
import { EmptyState } from '@/components/EmptyState';

export const metadata: Metadata = {
  title: 'Residential projects in Surat',
  description: 'Filter Surat residential projects by locality, SMC zone, budget, BHK, area, status and possession timing.',
};

type SP = Promise<Record<string, string | string[] | undefined>>;

function activeChips(f: Filters) {
  const chips: { label: string; href: string }[] = [];
  const without = (patch: Partial<Filters>) => `/projects${filtersToQuery({ ...f, ...patch, page: 1 })}`;
  if (f.q) chips.push({ label: `“${f.q}”`, href: without({ q: '' }) });
  for (const id of f.loc) chips.push({ label: getLocality(id)?.name ?? id, href: without({ loc: f.loc.filter((x) => x !== id) }) });
  if (f.zone) chips.push({ label: getZone(f.zone)?.name ?? f.zone, href: without({ zone: '' }) });
  for (const b of f.bhk) chips.push({ label: b, href: without({ bhk: f.bhk.filter((x) => x !== b) }) });
  if (f.budget) chips.push({ label: BUDGET_BANDS.find((b) => b.id === f.budget)?.label ?? f.budget, href: without({ budget: '' }) });
  for (const s of f.status) chips.push({ label: STATUS_LABEL[s] ?? s, href: without({ status: f.status.filter((x) => x !== s) }) });
  if (f.possession) chips.push({ label: f.possession === 'ready' ? 'Completed / ready' : `Completion by ${f.possession}`, href: without({ possession: '' }) });
  if (f.amin || f.amax) chips.push({ label: `Area ${f.amin ?? 0}–${f.amax ?? '∞'} sq ft`, href: without({ amin: undefined, amax: undefined }) });
  return chips;
}

export default async function ProjectsPage({ searchParams }: { searchParams: SP }) {
  const filters = parseFilters(await searchParams);
  const all = await publishedProjects();
  const res = searchProjects(all, filters);
  const chips = activeChips(filters);
  const hasAreaData = all.some((p) => p.areas.value.length > 0);
  const singleLoc = filters.loc.length === 1 ? getLocality(filters.loc[0]) : undefined;

  return (
    <div className="container results-page">
      <header className="results-head">
        <p className="eyebrow">Surat · Residential</p>
        <h1 className="results-title">
          {singleLoc ? `Projects in ${singleLoc.name}` : filters.zone ? `Projects in ${getZone(filters.zone)?.name}` : 'Residential projects'}
        </h1>
        <SearchBox defaultValue={filters.q} size="md" />
      </header>

      <div className="results-layout">
        <FilterPanel filters={filters} total={res.total} hasAreaData={hasAreaData} />
        <section aria-labelledby="results-count" className="results-main">
          <div className="results-bar">
            <p id="results-count" className="results-count" role="status" aria-live="polite">
              <strong>{res.total}</strong> {res.total === 1 ? 'project matches' : 'projects match'}
              {all.length > 0 && <span className="muted"> of {all.length} in the index</span>}
            </p>
            <SortSelect filters={filters} priceSortAvailable={res.priceSortAvailable} />
          </div>

          {chips.length > 0 && (
            <ul className="active-chips" aria-label="Active filters">
              {chips.map((c) => (
                <li key={c.label + c.href}>
                  <Link href={c.href} className="chip is-active" scroll={false}>
                    {c.label} <X size={14} aria-hidden="true" />
                    <span className="visually-hidden">Remove filter</span>
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/projects" className="linklike small">Clear all</Link>
              </li>
            </ul>
          )}

          {filters.q && res.interpretedLocalities.length > 0 && (
            <p className="small muted">Also matching localities: {res.interpretedLocalities.join(', ')}</p>
          )}

          {all.length === 0 ? (
            <EmptyState
              title="No projects have been published yet"
              body="The index only lists projects we can tie to a credible source. Developers and administrators can add projects through the submission and import workflow."
              action={{ href: '/submit', label: 'Submit a project' }}
            />
          ) : res.total === 0 ? (
            <EmptyState
              title="No projects match these filters"
              body={
                filters.budget || filters.amin || filters.amax
                  ? 'Budget and area filters only match projects with sourced prices or unit areas, and few records have them yet. Try removing those filters.'
                  : 'Try a nearby locality, a different zone, or fewer filters. Coverage is still growing and does not include every project in Surat.'
              }
              action={{ href: '/projects', label: 'Clear all filters' }}
            />
          ) : (
            <>
              <div className="card-grid card-grid--results">
                {res.items.map((p) => (
                  <ProjectCard key={p.id} project={p} headingLevel={2} />
                ))}
              </div>
              {res.page < res.pages && (
                <div className="load-more">
                  <Link className="btn btn-ghost" href={`/projects${filtersToQuery({ ...filters, page: res.page + 1 })}`} scroll={false}>
                    Load more ({res.total - res.items.length} remaining)
                  </Link>
                </div>
              )}
            </>
          )}
          <p className="tiny muted results-note">
            This index does not cover every project in Surat. Listing data may be out of date; always confirm registration
            details on the official Gujarat RERA portal before making decisions.
          </p>
        </section>
      </div>
    </div>
  );
}
