export type CmsPage = {
  id: number;
  slug: string;
  title: string;
  meta_title: string | null;
  meta_description: string | null;
  status: 'draft' | 'published';
  sort_order: number;
  enabled: number;
  created_at?: string;
  updated_at?: string;
  sections?: CmsSection[];
};

export type CmsSection = {
  id: number;
  page_id: number;
  type: string;
  section_key: string | null;
  title: string | null;
  sort_order: number;
  enabled: number;
  content_json: Record<string, unknown>;
  style_json: Record<string, unknown>;
};

export const SECTION_TYPES = [
  { type: 'hero', label: 'Hero slider' },
  { type: 'page_hero', label: 'Inner page hero' },
  { type: 'cert_hero', label: 'Certifications hero' },
  { type: 'eco', label: 'Ecosystem intro' },
  { type: 'stats', label: 'Stat bar' },
  { type: 'culture_stats', label: 'Culture / metric strip' },
  { type: 'quick_contact', label: 'Quick contact strip' },
  { type: 'locations', label: 'Office locations + map' },
  { type: 'why', label: 'Why cards' },
  { type: 'split', label: 'Split feature block' },
  { type: 'timeline', label: 'Legacy timeline' },
  { type: 'projects_teaser', label: 'Projects teaser' },
  { type: 'industries', label: 'Industries (grid / marquee)' },
  { type: 'industry_hub', label: 'Industries hub cards' },
  { type: 'industry_category', label: 'Industry category block' },
  { type: 'testimonials', label: 'Testimonials' },
  { type: 'partners', label: 'Partners marquee' },
  { type: 'logo_marquee', label: 'Logo / brand marquee' },
  { type: 'feature_grid', label: 'Feature cards grid' },
  { type: 'job_list', label: 'Job openings list' },
  { type: 'internship', label: 'Internship program' },
  { type: 'careers_apply', label: 'Careers apply form' },
  { type: 'cert_teaser', label: 'Certifications teaser' },
  { type: 'cert_cta', label: 'Certifications CTA' },
  { type: 'enquiry_form', label: 'Enquiry / contact form' },
  { type: 'cta', label: 'CTA band' },
  { type: 'rich_text', label: 'Rich text / HTML' },
  { type: 'comparison_table', label: 'Capability / Comparison table' },
  { type: 'about_hero', label: 'About · Page hero (split + image)' },
  { type: 'services_marquee', label: 'About · Services marquee' },
  { type: 'story', label: 'About · Story (image + text)' },
  { type: 'purpose', label: 'About · Purpose (mission / vision)' },
  { type: 'founder_note', label: "About · Founder's note" },
  { type: 'facilities', label: 'About · Facilities / How we work' },
  { type: 'life_hero', label: 'Life · Page hero (breadcrumb, pills, optional media)' },
  { type: 'life_stats', label: 'Life · Stat bar (count-up numbers)' },
  { type: 'life_cards', label: 'Life · Culture cards (Why Zigma)' },
  { type: 'life_roles', label: 'Life · Roles grid (animated icons)' },
  { type: 'life_events', label: 'Life · Events & moments (marquee / albums / grid)' },
  { type: 'life_gallery', label: 'Life · Gallery (mosaic + auto slider)' },
  { type: 'life_cta', label: 'Life · CTA band' },
  { type: 'legacy_hero', label: 'Legacy · Page hero (slideshow + years ring)' },
  { type: 'legacy_stats', label: 'Legacy · Stat bar (count-up numbers)' },
  { type: 'legacy_marquee', label: 'Legacy · Capabilities marquee' },
  { type: 'legacy_story', label: 'Legacy · Our story (photo collage)' },
  { type: 'legacy_journey', label: 'Legacy · Journey (animated timeline)' },
  { type: 'legacy_values', label: 'Legacy · Values (glass cards)' },
  { type: 'legacy_caps', label: 'Legacy · Capabilities grid' },
  { type: 'legacy_next', label: 'Legacy · Next twenty years (roadmap)' },
  { type: 'legacy_cta', label: 'Legacy · CTA band' },
  { type: 'contact_hero', label: 'Contact · Page hero (slideshow, leads, pills)' },
  { type: 'contact_quick', label: 'Contact · Quick contact bar' },
  { type: 'contact_help', label: 'Contact · How can we help (request cards)' },
  { type: 'contact_locations', label: 'Contact · Locations (offices + map / media)' },
  { type: 'contact_form', label: 'Contact · Enquiry form + contact panel' },
  { type: 'careers_hero', label: 'Careers · Page hero (slideshow, leads, pills)' },
  { type: 'careers_stats', label: 'Careers · Culture stats bar (count-up)' },
  { type: 'careers_cards', label: 'Careers · Icon cards (life at Zigma / benefits)' },
  { type: 'careers_why', label: 'Careers · Why join us (numbered cards)' },
  { type: 'careers_jobs', label: 'Careers · Current openings (job cards)' },
  { type: 'careers_internship', label: 'Careers · Internship program (text + program card)' },
  { type: 'careers_application', label: 'Careers · Application form + side panel' },
  { type: 'certs_hero', label: 'Certifications · Page hero (slideshow, sub-line, tagline)' },
  { type: 'certs_gallery', label: 'Certifications · Certificates gallery (marquee / grid + lightbox)' },
  { type: 'certs_cta', label: 'Certifications · CTA band (buttons, background media)' },
  { type: 'privacy_hero', label: 'Privacy · Page hero (slideshow, breadcrumb, lead)' },
  { type: 'privacy_policy', label: 'Privacy · Policy text (blocks, table of contents, media)' },
  { type: 'privacy_cta', label: 'Privacy · CTA band (buttons, background media)' },
  { type: 'terms_hero', label: 'Terms · Page hero (slideshow, breadcrumb, lead)' },
  { type: 'terms_policy', label: 'Terms · Terms text (blocks, table of contents, media)' },
  { type: 'terms_cta', label: 'Terms · CTA band (buttons, background media)' },
  { type: 'industries_hero', label: 'Industries · Page hero (slideshow, breadcrumb, lead, buttons)' },
  { type: 'industries_stats', label: 'Industries · Stats strip (numbers, icons, media)' },
  { type: 'industries_hub', label: 'Industries · Sector cards (picker, image / video cards)' },
  { type: 'industries_category', label: 'Industries · Category grid (icons, cards, links, media)' },
  { type: 'industries_cta', label: 'Industries · CTA band (split / stacked, buttons, media)' },
  { type: 'industry_page_hero', label: 'Industry page · Hero (slideshow, breadcrumb, lead, buttons)' },
  { type: 'industry_page_overview', label: 'Industry page · Overview text (blocks, table of contents, media)' },
  { type: 'industry_page_cta', label: 'Industry page · CTA band (split / stacked, buttons, media)' },
  { type: 'ind101_hero', label: 'Industries 101 · Page hero (sliding slideshow, breadcrumb, lead, buttons)' },
  { type: 'ind101_subnav', label: 'Industries 101 · Sticky category sub-nav (scroll-spy pills)' },
  { type: 'ind101_stats', label: 'Industries 101 · Quick stat strip (numbers, icons, colors)' },
  { type: 'ind101_category', label: 'Industries 101 · Category block (collage media, sector cards)' },
  { type: 'ind101_cta', label: 'Industries 101 · CTA band (buttons, background media)' },
  { type: 'qs_hero', label: 'Quality & Safety · Page hero (Ken Burns slideshow, breadcrumb, chips)' },
  { type: 'qs_stats', label: 'Quality & Safety · Stat bar (count-up numbers)' },
  { type: 'qs_quality', label: 'Quality & Safety · Quality approach (photo / video panel + process steps)' },
  { type: 'qs_safety', label: 'Quality & Safety · Safety first (photo gallery + habit cards)' },
  { type: 'qs_certs', label: 'Quality & Safety · Certificates & approvals (seals, checklists, request bar)' },
  { type: 'qs_commit', label: 'Quality & Safety · Our commitment (photo background + checklist)' },
  { type: 'qs_cta', label: 'Quality & Safety · CTA band (buttons, background media)' },
] as const;
