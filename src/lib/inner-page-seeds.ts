/** Seed content for Contact, Careers, and Certifications CMS pages (parity with public/*.html). */

const QC_ICON_PHONE =
  '<path d="M22 16.92v3a2 2 0 01-2.18 2 19.8 19.8 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.8 19.8 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.12.9.34 1.79.65 2.65a2 2 0 01-.45 2.11L8.09 9.7a16 16 0 006 6l1.22-1.22a2 2 0 012.11-.45c.86.31 1.75.53 2.65.65A2 2 0 0122 16.92z"/>';
const QC_ICON_EMAIL = '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 6l-10 7L2 6"/>';
const QC_ICON_QUOTE =
  '<path d="M9 12h6M9 16h6M9 8h2"/><path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5z"/><path d="M14 3v5h5"/>';
const QC_ICON_ALERT =
  '<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/>';
const LOC_PIN =
  '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>';

export const CONTACT_SEED_SECTIONS = [
  {
    type: 'page_hero',
    section_key: 'contact-hero',
    title: 'Contact Hero',
    content_json: {
      breadcrumb: 'Contact',
      eyebrow: 'GET IN TOUCH',
      title: 'Contact Us',
      leadEmphasis: 'Reliable power begins with the right engineering partner.',
      lead:
        "Whether you're investing in Solar Energy Systems, UPS & Critical Power Infrastructure, Battery Energy Storage (BESS), AMC & O&M Services, Emergency Technical Support, or comprehensive Power & Energy Engineering Solutions, our team is prepared to support your business at every stage.",
      leadAccent:
        "Tell us what you need, and we'll connect you with the right expert to deliver dependable, efficient, and future-ready solutions.",
      image: '/assets/images/zigma-technologies-help-desk-team-assist.jpg',
      imageAlt: 'Zigma Technologies help desk team assisting customers with solar, UPS, and engineering support',
      bodyClass: 'contact-page',
    },
  },
  {
    type: 'quick_contact',
    section_key: 'quick-contact',
    title: 'Quick Contact',
    content_json: {
      items: [
        {
          label: 'Call Us',
          value: '+91 95901 37444',
          href: 'tel:+919590137444',
          icon: QC_ICON_PHONE,
        },
        {
          label: 'Email Us',
          value: 'support@zigma-technologies.com',
          href: 'mailto:support@zigma-technologies.com',
          icon: QC_ICON_EMAIL,
        },
        {
          label: 'Get a Quote',
          value: 'Request a Quote',
          href: '#contact-form',
          subject: 'Request a Quote',
          icon: QC_ICON_QUOTE,
        },
        {
          label: 'Emergency Call',
          value: '+91 9590137666',
          href: 'tel:+919590137666',
          emergency: true,
          icon: QC_ICON_ALERT,
        },
      ],
    },
  },
  {
    type: 'feature_grid',
    section_key: 'how-we-help',
    title: 'How Can We Help',
    content_json: {
      eyebrow: 'HOW CAN WE HELP',
      eyebrowClass: 'eyebrow-orange',
      title: 'Tell Us What You Need',
      body: "Pick the option closest to your requirement and we'll route it straight to the right team.",
      tone: 'light',
      cards: [
        {
          title: 'Solar Solution',
          body: 'Enquire about a new solar installation, EPC project, or AMC for an existing solar plant.',
          variant: 'pastel-green',
          icon: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>',
          linkLabel: 'Ask About Solar →',
          subject: 'Solar Solution',
        },
        {
          title: 'UPS Solution',
          body: 'Talk to us about UPS sizing, installation, upgrades, or power backup for your facility.',
          variant: 'pastel-green',
          icon: '<path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/>',
          linkLabel: 'Ask About UPS →',
          subject: 'UPS Solution',
        },
        {
          title: 'BESS- Battery System',
          body: 'Get guidance on battery energy storage, hybrid systems, or replacement battery banks.',
          variant: 'pastel-green',
          icon: '<rect x="2" y="8" width="18" height="8" rx="1.5"/><path d="M22 10v4"/><path d="M6 8v8M10 8v8"/>',
          linkLabel: 'Ask About Batteries →',
          subject: 'BESS- Battery System',
        },
        {
          title: 'EV Charging Solution',
          body: 'Get a proposal for AC/DC EV charging stations, fleet charging, or Solar + EV + BESS integration.',
          variant: 'pastel-green',
          icon: '<path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/>',
          linkLabel: 'Ask About EV Charging →',
          subject: 'EV Charging Solution',
        },
        {
          title: 'AMC & Service Request',
          body: 'Set up or renew an Annual Maintenance Contract, or log a routine service, repair, or inspection.',
          icon: '<path d="M14.7 6.3a4 4 0 00-5.66 5.66l-6.2 6.2a1.5 1.5 0 002.12 2.12l6.2-6.2a4 4 0 005.66-5.66l-2.5 2.5-2.12-2.12z"/>',
          linkLabel: 'Start Request →',
          subject: 'AMC & Service Request',
        },
        {
          title: 'Request a Quote',
          body: 'Get a tailored proposal for a new solar EPC, UPS, battery storage, or engineering project.',
          icon: QC_ICON_QUOTE,
          linkLabel: 'Get a Quote →',
          subject: 'Request a Quote',
        },
        {
          title: 'Site Visit Request',
          body: 'Schedule an on-site survey or assessment with one of our field engineers.',
          icon: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="M9 15l2 2 4-4"/>',
          linkLabel: 'Schedule a Visit →',
          subject: 'Site Visit Request',
        },
        {
          title: 'Emergency Service Support',
          body: 'Power down or system failure? Our 24×7 response team is on call, every day of the year.',
          variant: 'emergency',
          icon: QC_ICON_ALERT,
          linkLabel: 'Call Now: +91 9590137666 →',
          linkHref: 'tel:+919590137666',
        },
      ],
    },
  },
  {
    type: 'locations',
    section_key: 'locations',
    title: 'Locations',
    content_json: {
      eyebrow: 'LOCATIONS',
      eyebrowClass: 'eyebrow-orange',
      title: 'Where to Find Us',
      body: 'Head-quartered in Bengaluru with regional service hubs across India, so field engineers are never far from your site.',
      mapEmbedUrl:
        'https://www.google.com/maps?q=19+%26+20+Brindavan+Enclaves,+DLF+City+Road,+Akshayanagar,+Bengaluru-560114&output=embed',
      mapTitle: 'Zigma Technologies — Bengaluru Head Office',
      locations: [
        {
          tag: 'Head Office',
          title: 'Bengaluru, Karnataka',
          address:
            '19 & 20 Brindavan Enclaves, DLF City Road, 3rd Cross, Rukmaiah Layout, Akshayanagar, Bengaluru-560114',
          phone: '+91 95901 37444',
          phoneHref: 'tel:+919590137444',
          directionsUrl: 'https://maps.app.goo.gl/P4Lxzy9z5p9imzHRA',
          icon: LOC_PIN,
        },
        {
          tag: 'Regional Service Hub',
          title: 'Mumbai, Maharashtra',
          address:
            'Siddhi Vinayak Apt, Plot no - 50, Sector 20, Kopar Khairane, Navi Mumbai, Maharashtra 400709',
          phone: '+91 9590137666',
          phoneHref: 'tel:+919590137666',
          directionsUrl: 'https://maps.app.goo.gl/NquKywecruod2gXb7',
          icon: LOC_PIN,
        },
        {
          tag: 'Regional Service Hub',
          title: 'Delhi, Uttar Pradesh',
          address: 'G. Floor, B Block Ground, 48 B, E Block, Sector 7, Noida, Uttar Pradesh 201301',
          phone: '+91 9590137666',
          phoneHref: 'tel:+919590137666',
          directionsUrl: 'https://maps.app.goo.gl/yJWGuMbMmAosL9Zq5',
          icon: LOC_PIN,
        },
      ],
    },
  },
  {
    type: 'enquiry_form',
    section_key: 'contact-form',
    title: 'Contact Form',
    content_json: {
      eyebrow: 'SEND A MESSAGE',
      title: 'Tell Us About Your Project',
      body: 'Fill in the details below — a Zigma engineer will respond within one business day.',
      formTitle: 'Send us a message',
      formIntro: 'All fields marked with * are required.',
      submitLabel: 'Submit Request →',
      privacyNote:
        'By submitting, you agree to be contacted by Zigma Technologies regarding your enquiry. We never share your details with third parties.',
      successTitle: 'Thank you — message received',
      successBody:
        'A member of our engineering team will get back to you within one business day. For anything urgent, please call our 24×7 emergency line.',
      sideTitle: 'Direct Contact',
      sideItems: [
        { label: 'Phone', value: '+91 95901 37444', href: 'tel:+919590137444', icon: QC_ICON_PHONE },
        {
          label: 'Email',
          value: 'support@zigma-technologies.com',
          href: 'mailto:support@zigma-technologies.com',
          icon: QC_ICON_EMAIL,
        },
        { label: 'Head Office', value: 'Bengaluru, Karnataka', icon: LOC_PIN },
      ],
      hoursTitle: 'Business Hours',
      hours: [
        { label: 'Mon – Sat', value: '9:00 AM – 7:00 PM' },
        { label: 'Sunday', value: 'Closed' },
      ],
      emergencyNote: {
        title: 'Need urgent help?',
        body: 'Our emergency call line is staffed every day of the year for critical power failures & all technical support.',
        phone: '+91 9590137666',
      },
    },
  },
] as const;

export const CAREERS_SEED_SECTIONS = [
  {
    type: 'page_hero',
    section_key: 'careers-hero',
    title: 'Careers Hero',
    content_json: {
      breadcrumb: 'Careers',
      eyebrow: 'JOIN THE TEAM',
      title: "Build India's Power Infrastructure With Us",
      lead:
        "At Zigma, engineers don't sit on the sidelines — they design, build, and maintain the solar, UPS, and battery systems that keep Indian industry running. If you want real ownership from day one, this is where you'll find it.",
      image: '/assets/images/zigma-technologies-engineers-collaborati.jpg',
      imageAlt: 'Zigma Technologies engineers collaborating on a power electronics project',
      bodyClass: 'careers-page',
    },
  },
  {
    type: 'culture_stats',
    section_key: 'culture',
    title: 'Culture Stats',
    content_json: {
      items: [
        { value: '20+', label: 'Years of Engineering' },
        { value: '150+', label: 'Engineers & Specialists' },
        { value: '1500+', label: 'Projects Delivered' },
        { value: '12+', label: 'Cities Across India' },
      ],
    },
  },
  {
    type: 'feature_grid',
    section_key: 'life-at-zigma',
    title: 'Life at Zigma',
    content_json: {
      eyebrow: 'LIFE AT ZIGMA',
      eyebrowClass: 'eyebrow-orange',
      title: 'Engineering-First, Every Day',
      body: "We're a team of people who'd rather be on-site solving a real problem than sitting through another status meeting. Here's what that looks like day to day.",
      tone: 'light',
      cards: [
        {
          title: 'Hands-On From Day One',
          body: 'No years-long ramp-up. New engineers get real site and project exposure within their first few months.',
          icon: '<path d="M14.7 6.3a4 4 0 00-5.66 5.66l-6.2 6.2a1.5 1.5 0 002.12 2.12l6.2-6.2a4 4 0 005.66-5.66l-2.5 2.5-2.12-2.12z"/>',
        },
        {
          title: 'Small Teams, Real Ownership',
          body: 'Flat project teams mean your decisions matter — and your name is on the work that ships.',
          icon: '<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>',
        },
        {
          title: 'Pan-India Project Exposure',
          body: 'Work across solar, UPS, and battery projects in multiple states — not just one client, one city.',
          icon: LOC_PIN,
        },
        {
          title: 'Growth That Keeps Pace',
          body: 'As Zigma grows, so does the scope of what you own — most of our team leads have grown up internally.',
          icon: '<path d="M12 20V10M18 20V4M6 20v-4"/>',
        },
      ],
    },
  },
  {
    type: 'why',
    section_key: 'why-join-us',
    title: 'Why Join Us',
    content_json: {
      eyebrow: 'WHY JOIN US',
      title: "What You'll Get Working Here",
      body: "Beyond the paycheck — here's what actually makes people stay at Zigma.",
      tone: 'gray',
      cards: [
        {
          index: '01',
          title: 'Real Engineering Impact',
          desc: 'Your work keeps hospitals, factories, and data centres powered — not stuck in a slide deck.',
          tint: 'tint-1',
        },
        {
          index: '02',
          title: 'Fast-Growing Company',
          desc: "We're scaling quickly across India, which means new roles, new responsibility, and new cities.",
          tint: 'tint-2',
        },
        {
          index: '03',
          title: 'Learn From Specialists',
          desc: "Work alongside engineers who've spent decades in solar, power electronics, and critical infrastructure.",
          tint: 'tint-3',
        },
        {
          index: '04',
          title: 'Ownership & Autonomy',
          desc: "Bring a better way to do something and you'll be the one who gets to build it.",
          tint: 'tint-4',
        },
        {
          index: '05',
          title: 'Competitive Growth Path',
          desc: 'Clear levels, regular reviews, and a straight line from individual contributor to project lead.',
          tint: 'tint-5',
        },
        {
          index: '06',
          title: 'Nationwide Opportunities',
          desc: 'Relocate, travel, or stay local — our project spread across India means options, not one fixed desk.',
          tint: 'tint-6',
        },
      ],
    },
  },
  {
    type: 'job_list',
    section_key: 'current-openings',
    title: 'Current Openings',
    content_json: {
      eyebrow: 'CURRENT OPENINGS',
      title: 'Open Roles Right Now',
      body: "Don't see an exact fit? Apply anyway — we're always looking for good engineers.",
      jobs: [
        { title: 'Solar Design Engineer', department: 'Engineering', location: 'Bengaluru', type: 'Full-Time' },
        { title: 'UPS Service Engineer', department: 'Field Service', location: 'Mumbai', type: 'Full-Time' },
        {
          title: 'Site Supervisor — Solar EPC',
          department: 'Site Operations',
          location: 'Delhi',
          type: 'Full-Time',
        },
        {
          title: 'Business Development Manager',
          department: 'Sales',
          location: 'Bengaluru',
          type: 'Full-Time',
        },
        {
          title: 'Graduate Engineer Trainee',
          department: 'Engineering',
          location: 'Multiple Locations',
          type: 'Full-Time',
        },
      ],
    },
  },
  {
    type: 'internship',
    section_key: 'internship-program',
    title: 'Internship Program',
    content_json: {
      eyebrow: 'INTERNSHIP PROGRAM',
      title: 'Start Your Career in Power Engineering',
      body: "Our internship program puts students and fresh graduates on real solar, UPS, and engineering projects — not just filing paperwork. You'll be paired with a senior engineer and given actual project work from week one.",
      cardTitle: 'Zigma Engineering Internship',
      cardBody:
        'Open to final-year students and recent graduates in Electrical, Electronics, or Mechanical Engineering.',
      points: [
        { label: 'Duration', value: '3 – 6 Months' },
        { label: 'Locations', value: 'Bengaluru, Mumbai, Delhi' },
        { label: 'Stipend', value: 'Paid, Performance-Linked' },
        { label: 'Disciplines', value: 'EEE, ECE, Mechanical' },
      ],
      cta: 'Apply for Internship →',
      applyRole: 'Internship Program',
    },
  },
  {
    type: 'feature_grid',
    section_key: 'employee-benefits',
    title: 'Employee Benefits',
    content_json: {
      eyebrow: 'EMPLOYEE BENEFITS',
      eyebrowClass: 'eyebrow-orange',
      title: 'We Take Care of Our People',
      body: 'Benefits designed around real life, not just a checklist.',
      tone: 'light',
      cards: [
        {
          title: 'Health Insurance',
          body: 'Comprehensive medical coverage for you and your immediate family.',
          icon: '<path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 000-7.78z"/>',
        },
        {
          title: 'Learning & Development',
          body: 'Certifications, technical training, and conference sponsorship for the right roles.',
          icon: '<path d="M22 10v6M2 10l10-5 10 5-10 5-10-5z"/><path d="M6 12v5c0 1.5 3 3 6 3s6-1.5 6-3v-5"/>',
        },
        {
          title: 'Performance Bonuses',
          body: 'Annual and project-linked bonuses tied to real outcomes, not just tenure.',
          icon: '<path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>',
        },
        {
          title: 'Flexible Leave Policy',
          body: 'Leave that respects family needs, travel, and the realities of field engineering life.',
          icon: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
        },
        {
          title: 'Provident Fund',
          body: 'Statutory PF contributions and long-term savings support as part of your package.',
          icon: '<path d="M3 21h18M5 21V9l6-4 6 4v12M9 21v-6h6v6"/>',
        },
        {
          title: 'Employee Recognition',
          body: 'Peer and leadership recognition for people who quietly keep critical systems online.',
          icon: '<path d="M12 3.5l2.47 5.01 5.53.8-4 3.9.94 5.5-4.94-2.6-4.94 2.6.94-5.5-4-3.9 5.53-.8L12 3.5z"/>',
        },
      ],
    },
  },
  {
    type: 'careers_apply',
    section_key: 'apply',
    title: 'Apply Online',
    content_json: {
      eyebrow: 'APPLY ONLINE',
      title: 'Ready to Apply?',
      body: 'Fill in your details below — our HR team reviews every application within 3–5 business days.',
      formTitle: 'Submit Your Application',
      formIntro: 'All fields marked with * are required.',
      submitLabel: 'Submit Application →',
      privacyNote:
        'By applying, you agree to be contacted by Zigma Technologies regarding your application. We never share your details with third parties.',
      successTitle: 'Application received',
      successBody:
        'Thank you for applying to Zigma Technologies. We sincerely appreciate your interest in joining our team. Our recruitment team will review your application and contact you if your profile matches our current requirements. We look forward to connecting with you soon.',
      nextTitle: 'What Happens Next?',
      nextSteps: [
        { text: 'We review all applications within 3–5 business days.' },
        {
          text: 'Shortlisted candidates will receive a phone call or email to schedule the first interview.',
        },
        {
          text: 'The final interview is typically conducted with the Hiring Manager and the Head of Department or Department Manager.',
        },
      ],
      sideTitle: 'Questions About a Role?',
      sideItems: [
        {
          label: 'Careers Email',
          value: 'careers@zigma-technologies.com',
          href: 'mailto:careers@zigma-technologies.com',
          icon: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 6l-10 7L2 6"/>',
        },
        {
          label: 'Contact HR',
          value: 'hr@zigma-technologies.com',
          href: 'mailto:hr@zigma-technologies.com',
          icon: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 6l-10 7L2 6"/>',
        },
        {
          label: 'Phone',
          value: '+91 95901 37444',
          href: 'tel:+919590137444',
          icon: '<path d="M22 16.92v3a2 2 0 01-2.18 2 19.8 19.8 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.8 19.8 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.12.9.34 1.79.65 2.65a2 2 0 01-.45 2.11L8.09 9.7a16 16 0 006 6l1.22-1.22a2 2 0 012.11-.45c.86.31 1.75.53 2.65.65A2 2 0 0122 16.92z"/>',
        },
      ],
      roles: [
        'Solar Design Engineer',
        'UPS Service Engineer',
        'Site Supervisor — Solar EPC',
        'Business Development Manager',
        'Graduate Engineer Trainee',
        'Internship Program',
        'General Application',
      ],
    },
  },
] as const;

export const CERTIFICATIONS_SEED_SECTIONS = [
  {
    type: 'cert_hero',
    section_key: 'cert-hero',
    title: 'Certifications Hero',
    content_json: {
      eyebrow: 'CERTIFICATIONS & PARTNERSHIPS',
      title: 'Our Certifications, Authorizations & Engineering Partners',
      sub: 'Certified Excellence. Trusted Performance.',
      lead:
        'Our OEM authorizations, industry certifications, and engineering partnerships demonstrate our commitment to quality, technical expertise, and reliable service across power, renewable energy, and industrial engineering solutions.',
      tagline: 'Recognized by Industry Leaders. Trusted by Businesses Across India.',
    },
  },
  {
    type: 'logo_marquee',
    section_key: 'oem-marquee',
    title: 'OEM Marquee',
    content_json: {
      items: [
        {
          name: 'Kirloskar Solar Technologies',
          image: '/assets/images/kirloskar-solar-technologies-authorizati.jpg',
        },
        {
          name: 'OCV — ISO 9001:2015',
          image: '/assets/images/ocv-iso-9001-2015-certificate-of-registr.jpg',
        },
        {
          name: 'ABB Channel Partner',
          image: '/assets/images/abb-channel-partner-certificate.jpg',
        },
        {
          name: 'Schneider Electric',
          image: '/assets/images/schneider-electric-certificate-of-author.jpg',
        },
        {
          name: 'Avetta Consortium Member',
          image: '/assets/images/avetta-consortium-membership-certificate.jpg',
        },
        {
          name: 'Karnataka Annual Solar Awards 2025',
          image: '/assets/images/certifications-img-0.jpg',
        },
      ],
    },
  },
  {
    type: 'cert_cta',
    section_key: 'cert-cta',
    title: 'Certifications CTA',
    content_json: {
      cta: 'Talk to Our Engineering Team →',
      ctaHref: '/contact#contact-form',
    },
  },
] as const;

/** Ready-to-use Capability/Comparison Table seed — add to any CMS page via Admin → Pages → + Section */
export const CAPABILITY_COMPARISON_SEED = {
  type: 'comparison_table',
  section_key: 'capability-comparison',
  title: 'Capability Comparison',
  content_json: {
    eyebrow: 'WHY ZIGMA',
    title: 'Capability at a Glance',
    body: 'Compare our core service lines side by side — built to guide you to the right solution faster.',
    featureLabel: 'Capability',
    tone: 'light',
    columns: [
      { label: 'Solar EPC', sub: 'Generate', highlight: false },
      { label: 'UPS / Power', sub: 'Protect', highlight: true },
      { label: 'BESS', sub: 'Store', highlight: false },
      { label: 'EV Charging', sub: 'Mobilise', highlight: false },
      { label: 'AMC / O&M', sub: 'Maintain', highlight: false },
    ],
    rows: [
      { group: 'Delivery', feature: 'Full EPC (Design-Supply-Commission)', values: [true, false, true, true, false] },
      { group: 'Delivery', feature: 'Annual Maintenance Contract', values: [true, true, true, true, true] },
      { group: 'Delivery', feature: '24×7 Emergency Support', values: [false, true, false, false, true] },
      { group: 'Commercial', feature: 'Branded OEM Equipment', values: [true, true, true, true, true] },
      { group: 'Commercial', feature: 'Turnkey Fixed-Price Option', values: [true, false, true, true, false] },
      { group: 'Commercial', feature: 'Flexible Financing Available', values: [true, true, false, false, false] },
      { group: 'Technical', feature: 'Remote Monitoring & Alerts', values: [true, false, true, false, true] },
      { group: 'Technical', feature: 'Site Survey Included', values: [true, true, true, true, true] },
      { group: 'Technical', feature: 'Engineering Design Drawings', values: [true, true, true, true, false] },
      { group: 'Compliance', feature: 'MNRE / DISCOM Approvals', values: [true, false, false, false, false] },
      { group: 'Compliance', feature: 'Certified Installations (ISO)', values: [true, true, true, true, true] },
    ],
    cta: 'Request a Consultation →',
    ctaHref: '/contact#contact-form',
    ctaNote: 'Our engineers will match the right solution to your facility.',
  },
};
