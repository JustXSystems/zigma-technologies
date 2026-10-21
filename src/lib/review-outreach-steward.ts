/**
 * Product-plane growth steward: when an enquiry is closed as won work,
 * draft a one-click review mailto (never auto-sends — human clicks).
 */
import { getEnquiry, mergeEnquiryPayload } from '@/lib/catalog';
import { getThemeSettings } from '@/lib/cms';
import { mergeSiteSettings } from '@/lib/site-settings';

function reviewLinkFromSettings(settings: {
  mapsUrl?: string | null;
  companyName?: string | null;
}): string {
  const placeId = (process.env.MERIDIAN_GBP_PLACE_ID || '').trim();
  if (placeId) {
    return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;
  }
  const envLink = (process.env.MERIDIAN_GBP_REVIEW_LINK || '').trim();
  if (envLink) return envLink;
  if (settings.mapsUrl?.trim()) return settings.mapsUrl.trim();
  const brand = settings.companyName || 'Zigma Technologies';
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${brand}, Bengaluru`)}`;
}

export type ReviewOutreachDraft = {
  draftedAt: string;
  reviewLink: string;
  mailto: string;
  whatsappHint: string;
  subject: string;
  status: 'draft';
  sentAt: null;
};

/**
 * Call after enquiry status → closed, or to backfill an already-closed lead.
 * Idempotent if draft already exists (unless force).
 * Skips careers applications (hiring pipeline owns that inbox).
 */
export async function draftReviewOutreachOnClose(
  enquiryId: number,
  opts: { force?: boolean } = {}
): Promise<ReviewOutreachDraft | null> {
  const enquiry = await getEnquiry(enquiryId);
  if (!enquiry || enquiry.status !== 'closed') return null;

  const itemType = String(enquiry.item_type || '');
  if (itemType === 'careers_apply' || itemType === 'job' || itemType === 'career') return null;

  const existing = enquiry.payload_json?.reviewOutreach as ReviewOutreachDraft | undefined;
  if (!opts.force && existing?.mailto && existing.status === 'draft') return existing;

  const settings = await getThemeSettings()
    .then((t) => mergeSiteSettings(t.site))
    .catch(() => mergeSiteSettings({}));
  const brand = settings.companyName || 'Zigma Technologies';
  const reviewLink = reviewLinkFromSettings(settings);
  const name = String(enquiry.payload_json?.name || 'there').trim() || 'there';
  const email = String(enquiry.payload_json?.email || '').trim();
  const project = String(enquiry.item_title || enquiry.payload_json?.subject || 'your recent project').trim();

  const subject = `How did we do on ${project}?`;
  const body = [
    `Dear ${name},`,
    '',
    `Thank you for trusting ${brand} with ${project}. We hope everything is running well.`,
    '',
    'Would you take a minute to share your experience on Google? Your feedback helps other facility and plant managers make informed decisions.',
    '',
    `Leave a review: ${reviewLink}`,
    '',
    'If anything was not up to your expectations, please reply to this email directly so we can fix it.',
    '',
    `Warm regards,`,
    brand,
  ].join('\n');

  const mailto = email
    ? `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    : `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  const whatsappHint = `Hello ${name}, thank you for choosing ${brand} for ${project}. If you're happy with our work, would you share a short Google review? ${reviewLink}`;

  const draft: ReviewOutreachDraft = {
    draftedAt: new Date().toISOString(),
    reviewLink,
    mailto,
    whatsappHint,
    subject,
    status: 'draft',
    sentAt: null,
  };

  await mergeEnquiryPayload(enquiryId, { reviewOutreach: draft });
  return draft;
}
