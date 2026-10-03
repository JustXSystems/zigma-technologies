/** Site Copy text owned by Header & Footer → Labels (stored in the shared `site_copy` object). */

export type ChromeLabelField = { path: string; label: string; multiline?: boolean };

export type ChromeLabelGroup = {
  id: string;
  title: string;
  description: string;
  fields: ChromeLabelField[];
};

export const CHROME_LABEL_GROUPS: ChromeLabelGroup[] = [
  {
    id: 'footer',
    title: 'Footer',
    description:
      'Newsletter box and Contact column. Office / Hours / SLA labels set in Footer → Footer office block win; these are the fallbacks.',
    fields: [
      { path: 'footer.newsletterLabel', label: 'Newsletter label' },
      { path: 'footer.newsletterPlaceholder', label: 'Newsletter placeholder' },
      { path: 'footer.subscribe', label: 'Subscribe button' },
      { path: 'footer.subscribeSuccess', label: 'Subscribe success' },
      { path: 'footer.contactHeading', label: 'Contact column heading' },
      { path: 'footer.officeHeading', label: 'Office block label (fallback)' },
      { path: 'footer.officeHoursLabel', label: 'Office hours label (fallback)' },
      { path: 'footer.officeSlaLabel', label: 'Office SLA label (fallback)' },
    ],
  },
  {
    id: 'sticky',
    title: 'Sticky bar & Talk',
    description:
      'Mobile sticky bar buttons, WhatsApp prefill and Talk labels used outside the header. The header Talk to us menu is under Header.',
    fields: [
      { path: 'footer.stickyCall', label: 'Sticky · Call' },
      { path: 'footer.stickyWhatsapp', label: 'Sticky · WhatsApp' },
      { path: 'footer.stickyQuote', label: 'Sticky · Quote' },
      { path: 'talk.whatsapp', label: 'Talk · WhatsApp label (non-header)' },
      { path: 'talk.solutionFinder', label: 'Talk · Solution finder (hubs)' },
      { path: 'talk.whatsappPrefill', label: 'WhatsApp prefill', multiline: true },
    ],
  },
  {
    id: 'search',
    title: 'Search box',
    description: 'Header search field.',
    fields: [
      { path: 'searchForm.placeholder', label: 'Search placeholder' },
      { path: 'searchForm.ariaLabel', label: 'Search button / aria' },
    ],
  },
  {
    id: 'a11y',
    title: 'Icon & button names',
    description: 'Read by screen readers for icon-only buttons and links.',
    fields: [
      { path: 'a11y.menuToggle', label: 'Menu toggle' },
      { path: 'a11y.close', label: 'Close' },
      { path: 'a11y.closeConsultation', label: 'Close consultation' },
      { path: 'a11y.closeEnquiry', label: 'Close enquiry' },
      { path: 'a11y.copyLink', label: 'Copy link' },
      { path: 'a11y.facebook', label: 'Facebook' },
      { path: 'a11y.instagram', label: 'Instagram' },
      { path: 'a11y.linkedin', label: 'LinkedIn' },
      { path: 'a11y.x', label: 'X (Twitter)' },
      { path: 'a11y.youtube', label: 'YouTube' },
      { path: 'a11y.viewCertifications', label: 'Certifications link' },
    ],
  },
];

export const CHROME_LABEL_PATHS = CHROME_LABEL_GROUPS.flatMap((g) => g.fields.map((f) => f.path));
