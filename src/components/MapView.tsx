'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * OpenStreetMap via Leaflet (both free/open). Rendered only when sourced coordinates exist.
 * The map is loaded on demand to keep the detail page light. Keyboard: Leaflet supports
 * arrow-key panning and +/- zoom once the map has focus.
 */
export function MapView({ lat, lng, label }: { lat: number; lng: number; label: string }) {
  const el = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!show || !el.current) return;
    let map: import('leaflet').Map | undefined;
    (async () => {
      const L = (await import('leaflet')).default;
      await import('leaflet/dist/leaflet.css');
      map = L.map(el.current!, { scrollWheelZoom: false, keyboard: true }).setView([lat, lng], 15);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);
      L.circleMarker([lat, lng], { radius: 9, color: '#9a3b26', weight: 2, fillOpacity: 0.35 }).addTo(map).bindTooltip(label);
    })();
    return () => {
      map?.remove();
    };
  }, [show, lat, lng, label]);

  return (
    <div className="mapbox">
      {show ? (
        <div ref={el} className="mapbox__map" role="region" aria-label={`Map showing ${label}`} tabIndex={0} />
      ) : (
        <button type="button" className="btn btn-ghost" onClick={() => setShow(true)}>
          Show location map (OpenStreetMap)
        </button>
      )}
    </div>
  );
}
