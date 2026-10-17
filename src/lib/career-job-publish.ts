/**
 * Client-safe publish gates + share URL helpers for Careers / Hiring.
 * Server also re-checks before status → open.
 */

import type { CareerJobContent } from '@/lib/career-hiring-types';

export type PublishJobFields = {
  title?: string | null;
  location?: string | null;
  summary?: string | null;
  content?: Partial<CareerJobContent> | null;
  responsibilitiesText?: string | null;
  requirementsText?: string | null;
};

function lines(raw: string | string[] | null | undefined): string[] {
  if (Array.isArray(raw)) return raw.map((s) => String(s).trim()).filter(Boolean);
  return String(raw || '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Hard errors that block Go live / Publish. */
export function validateJobForPublish(input: PublishJobFields): string[] {
  const errors: string[] = [];
  const title = String(input.title || '').trim();
  if (!title) errors.push('Job title is required');
  if (!String(input.location || '').trim()) errors.push('Location is required before going live');
  if (!String(input.summary || '').trim()) errors.push('Short summary is required before going live');

  const responsibilities =
    lines(input.responsibilitiesText).length > 0
      ? lines(input.responsibilitiesText)
      : lines(input.content?.responsibilities);
  const requirements =
    lines(input.requirementsText).length > 0
      ? lines(input.requirementsText)
      : lines(input.content?.requirements);

  if (responsibilities.length < 2) {
    errors.push('Add at least 2 key responsibilities (one per line)');
  }
  if (requirements.length < 2) {
    errors.push('Add at least 2 requirements (one per line)');
  }
  return errors;
}

export function normalizeJobTitleKey(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/** Public apply deep-link (preselects role via ?job=publicId). */
export function buildCareersApplyUrl(opts: {
  siteUrl?: string;
  publicId: string;
  slug?: string | null;
}): string {
  const base = (opts.siteUrl || (typeof window !== 'undefined' ? window.location.origin : '')).replace(/\/$/, '');
  const pid = encodeURIComponent(opts.publicId);
  const hash = opts.slug ? `#job-${encodeURIComponent(opts.slug)}` : '#apply';
  return `${base}/careers?job=${pid}${hash === '#apply' ? '#apply' : hash}`;
}

export function buildWhatsAppShareUrl(opts: {
  title: string;
  location?: string | null;
  applyUrl: string;
}): string {
  const loc = opts.location?.trim() ? ` (${opts.location.trim()})` : '';
  const text = `We're hiring: ${opts.title.trim()}${loc}\n\nApply here: ${opts.applyUrl}`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromDatetimeLocalValue(local: string): string | null {
  const v = local.trim();
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}
