/** Website submissions that can be forwarded to the CRM webhook, in display order. */
export const CRM_LEAD_KINDS = [
  { id: 'enquiry', label: 'Enquiries', hint: 'Contact page, enquiry pop-up and product / project forms', byDefault: true },
  { id: 'callback', label: 'Callback requests', hint: 'Name, phone and preferred time', byDefault: true },
  { id: 'brochure', label: 'Brochure downloads', hint: 'Contact details and the brochure requested', byDefault: true },
  { id: 'careers', label: 'Job applications', hint: 'Applicant details and role. The CV file itself stays on this server', byDefault: false },
  { id: 'newsletter', label: 'Newsletter sign-ups', hint: 'New email addresses only', byDefault: false },
] as const;

export type CrmLeadKind = (typeof CRM_LEAD_KINDS)[number]['id'];

/** Stored when every kind is switched off — a blank setting would fall back to the defaults. */
const NO_KINDS = 'none';

export const DEFAULT_CRM_LEAD_KINDS = CRM_LEAD_KINDS.filter((kind) => kind.byDefault)
  .map((kind) => kind.id)
  .join(',');

export function parseCrmLeadKinds(raw: string | undefined): Set<CrmLeadKind> {
  const wanted = new Set((raw ?? DEFAULT_CRM_LEAD_KINDS).split(',').map((part) => part.trim()));
  return new Set(CRM_LEAD_KINDS.filter((kind) => wanted.has(kind.id)).map((kind) => kind.id));
}

export function serializeCrmLeadKinds(kinds: ReadonlySet<CrmLeadKind>): string {
  const ids = CRM_LEAD_KINDS.filter((kind) => kinds.has(kind.id)).map((kind) => kind.id);
  return ids.length ? ids.join(',') : NO_KINDS;
}
