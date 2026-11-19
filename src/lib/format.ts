import type { AreaValue, Price } from './types';
import { AREA_LABEL } from './labels';

export function formatINR(n: number): string {
  if (n >= 1_00_00_000) return `₹${trim(n / 1_00_00_000)} Cr`;
  if (n >= 1_00_000) return `₹${trim(n / 1_00_000)} L`;
  return `₹${n.toLocaleString('en-IN')}`;
}
const trim = (n: number) => (Math.round(n * 100) / 100).toString();

export function formatPrice(p: Price): { text: string; qualifier?: string } {
  const unit = p.unit === 'per_sq_ft' ? ' / sq ft' : '';
  switch (p.kind) {
    case 'starting':
      return { text: p.min ? `From ${formatINR(p.min)}${unit}` : 'Price on request', qualifier: p.qualification };
    case 'range':
      return {
        text: p.min && p.max ? `${formatINR(p.min)} – ${formatINR(p.max)}${unit}` : 'Price on request',
        qualifier: p.qualification,
      };
    case 'on_request':
      return { text: 'Price on request' };
    default:
      return { text: 'Price not provided' };
  }
}

export function formatArea(a: AreaValue): string {
  const u = a.unit === 'sq_m' ? 'sq m' : 'sq ft';
  const range = a.min && a.max && a.min !== a.max ? `${a.min.toLocaleString('en-IN')}–${a.max.toLocaleString('en-IN')}` : `${(a.min ?? a.max)?.toLocaleString('en-IN')}`;
  return `${AREA_LABEL[a.kind]}: ${range} ${u}${a.configuration ? ` (${a.configuration})` : ''}`;
}

export function formatDate(iso?: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }): string {
  if (!iso) return '—';
  const d = new Date(iso.length === 7 ? `${iso}-01` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', { ...opts, timeZone: 'Asia/Kolkata' });
}

export const formatMonth = (iso?: string) => formatDate(iso, { month: 'short', year: 'numeric' });
