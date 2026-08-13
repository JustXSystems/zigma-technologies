/** Seed content for Privacy + Terms CMS pages */

export const PRIVACY_SEED_SECTIONS = [
  {
    type: 'page_hero',
    section_key: 'privacy-hero',
    title: 'Privacy Hero',
    content_json: {
      breadcrumb: 'Privacy',
      eyebrow: 'LEGAL',
      title: 'Privacy Policy',
      lead: 'How Zigma Technologies collects, uses, and protects information shared through our website and enquiry channels.',
      image: '/assets/images/engineers-reviewing-electrical-design-dr.jpg',
      bodyClass: 'legal-page',
    },
  },
  {
    type: 'rich_text',
    section_key: 'privacy-body',
    title: 'Privacy Body',
    content_json: {
      html: `<p>We collect contact details you voluntarily submit via enquiry forms, careers applications, newsletter signup, and direct email or phone. This may include name, company, email, phone number, project requirements, and — when you apply for a role — work experience and a CV/resume file.</p>
<p>Information is used to respond to requests, evaluate job applications, improve our services, and (with consent) send occasional updates. We do not sell personal data. Resume files are stored privately and are accessible only to authorized staff through the admin portal.</p>
<p>Data is stored securely with access limited to authorized staff. You may request correction or deletion by contacting <a href="mailto:info@zigma-technologies.com">info@zigma-technologies.com</a>.</p>
<p>This policy may be updated periodically. Continued use of the site after changes constitutes acceptance of the revised policy.</p>`,
    },
  },
  {
    type: 'cta',
    section_key: 'privacy-cta',
    title: 'Privacy CTA',
    content_json: {
      title: 'Questions about your data?',
      body: 'Reach our team and we will help with access, correction, or deletion requests.',
      primaryCta: 'Contact us',
      primaryHref: '/contact',
      secondaryCta: 'Terms of use',
      secondaryHref: '/terms',
    },
  },
] as const;

export const TERMS_SEED_SECTIONS = [
  {
    type: 'page_hero',
    section_key: 'terms-hero',
    title: 'Terms Hero',
    content_json: {
      breadcrumb: 'Terms',
      eyebrow: 'LEGAL',
      title: 'Terms of Use',
      lead: 'Guidelines for using the Zigma Technologies website and related digital content.',
      image: '/assets/images/engineers-inspecting-switchgear-panels-i.jpg',
      bodyClass: 'legal-page',
    },
  },
  {
    type: 'rich_text',
    section_key: 'terms-body',
    title: 'Terms Body',
    content_json: {
      html: `<p>Content on this website is provided for general information about our engineering capabilities, products, and services. Specifications and availability may change without notice.</p>
<p>All trademarks, logos, and project imagery remain the property of their respective owners. You may not copy or redistribute site materials for commercial use without written permission.</p>
<p>Enquiries submitted through the site do not create a binding contract until confirmed in writing by Zigma Technologies.</p>
<p>To the fullest extent permitted by law, we are not liable for indirect or consequential damages arising from use of this website. Governing law is that of India, with disputes subject to courts in Bengaluru unless otherwise agreed.</p>`,
    },
  },
  {
    type: 'cta',
    section_key: 'terms-cta',
    title: 'Terms CTA',
    content_json: {
      title: 'Need a formal agreement?',
      body: 'Project scopes, SLAs, and commercial terms are issued separately for each engagement.',
      primaryCta: 'Request consultation',
      primaryHref: '/contact#contact-form',
      secondaryCta: 'Privacy policy',
      secondaryHref: '/privacy',
    },
  },
] as const;
