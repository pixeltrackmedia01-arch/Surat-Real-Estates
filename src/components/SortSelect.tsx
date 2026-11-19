'use client';

import { useRouter } from 'next/navigation';
import type { Filters, SortKey } from '@/lib/search';
import { filtersToQuery } from '@/lib/search';

export function SortSelect({ filters, priceSortAvailable }: { filters: Filters; priceSortAvailable: boolean }) {
  const router = useRouter();
  return (
    <div className="sort">
      <label htmlFor="sort" className="small muted">Sort</label>
      <select
        id="sort"
        className="select select--inline"
        value={filters.sort}
        onChange={(e) => router.replace(`/projects${filtersToQuery({ ...filters, page: 1, sort: e.target.value as SortKey })}`, { scroll: false })}
      >
        <option value="relevance">Relevance</option>
        <option value="updated">Recently updated</option>
        <option value="price_asc" disabled={!priceSortAvailable}>
          Price: low to high{priceSortAvailable ? '' : ' (no price data)'}
        </option>
        <option value="price_desc" disabled={!priceSortAvailable}>
          Price: high to low{priceSortAvailable ? '' : ' (no price data)'}
        </option>
      </select>
    </div>
  );
}
