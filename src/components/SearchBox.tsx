'use client';

import { useId, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Search } from 'lucide-react';
import { getZone, isPinQuery, localitiesForPin, matchLocalities } from '@/lib/geo';

/**
 * Accessible combobox (ARIA 1.2 pattern). Works without JavaScript as a plain GET form to /projects.
 * Suggestions resolve locality spellings/aliases and PIN codes; selecting one filters by locality.
 */
export function SearchBox({ defaultValue = '', size = 'lg', autoFocus = false }: { defaultValue?: string; size?: 'lg' | 'md'; autoFocus?: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = useMemo(() => {
    if (q.trim().length < 2) return [];
    if (isPinQuery(q)) {
      return localitiesForPin(q.trim()).slice(0, 6).map((l) => ({ id: l.id, name: l.name, hint: `PIN ${q.trim()} · ${getZone(l.zoneId)?.name ?? 'Zone not established'}` }));
    }
    return matchLocalities(q)
      .slice(0, 6)
      .map((m) => ({
        id: m.locality.id,
        name: m.locality.name,
        hint: `${m.matched !== m.locality.name ? `“${m.matched}” · ` : ''}${getZone(m.locality.zoneId)?.name ?? 'Zone not established'}`,
      }));
  }, [q]);

  const go = (locId?: string) => {
    setOpen(false);
    if (locId) router.push(`/projects?loc=${encodeURIComponent(locId)}`);
    else router.push(q.trim() ? `/projects?q=${encodeURIComponent(q.trim())}` : '/projects');
  };

  return (
    <form
      role="search"
      action="/projects"
      method="get"
      className={`searchbox searchbox--${size}`}
      onSubmit={(e) => {
        e.preventDefault();
        go(active >= 0 ? suggestions[active]?.id : undefined);
      }}
    >
      <label htmlFor={`${id}-q`} className="visually-hidden">
        Search by project, locality, developer or PIN code
      </label>
      <Search className="searchbox__icon" size={size === 'lg' ? 22 : 18} aria-hidden="true" />
      <input
        ref={inputRef}
        id={`${id}-q`}
        name="q"
        type="search"
        className="searchbox__input"
        placeholder="Project, locality, developer or PIN — e.g. Vesu, Pal, 395007"
        autoComplete="off"
        autoFocus={autoFocus}
        value={q}
        role="combobox"
        aria-expanded={open && suggestions.length > 0}
        aria-controls={`${id}-list`}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${id}-opt-${active}` : undefined}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setOpen(true);
            setActive((a) => Math.min(suggestions.length - 1, a + 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((a) => Math.max(-1, a - 1));
          } else if (e.key === 'Escape') {
            setOpen(false);
            setActive(-1);
          }
        }}
      />
      <button type="submit" className="btn btn-ink searchbox__btn">
        Search
      </button>
      {open && suggestions.length > 0 && (
        <ul id={`${id}-list`} role="listbox" className="searchbox__list" aria-label="Matching localities">
          {suggestions.map((s, i) => (
            <li
              key={s.id}
              id={`${id}-opt-${i}`}
              role="option"
              aria-selected={i === active}
              className="searchbox__opt"
              onMouseDown={(e) => {
                e.preventDefault();
                go(s.id);
              }}
            >
              <MapPin size={15} aria-hidden="true" />
              <span>
                <strong>{s.name}</strong>
                <span className="tiny muted"> — {s.hint}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
