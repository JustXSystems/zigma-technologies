/**
 * Self-serve copy for Catalog Settings.
 * Edit here so admins understand purpose / when / how without asking engineering.
 */

export type SettingsGuide = {
  purpose: string;
  when: string;
  how: string;
  tip?: string;
};

export type SettingsSectionId = 'hero' | 'listing' | 'popup' | 'discovery' | 'categories';

export const CATALOG_SETTINGS_PAGE_INTRO = {
  title: 'Catalog settings',
  lead:
    'Each catalog type (products, projects, services) has its own settings. Changes apply to the public listing page after you Save. Work one section at a time: Hero → Listing → Quick view → Discovery → Categories.',
};

export const CATALOG_SETTINGS_SECTIONS: Array<{
  id: SettingsSectionId;
  label: string;
  title: string;
  summary: string;
  guide: SettingsGuide;
}> = [
  {
    id: 'hero',
    label: 'Hero',
    title: 'Hero spotlight',
    summary:
      'The large banner at the top of the public catalog page. It introduces the catalog and can rotate featured items.',
    guide: {
      purpose:
        'Create a strong first impression and highlight a short list of priority items before visitors scroll the grid.',
      when:
        'Turn on when the catalog should feel curated (campaigns, launches, flagship products). Turn off for a minimal page that jumps straight to filters and cards.',
      how: 'Enable the hero, choose a visual style + variant, write title/lead copy, pick which elements show, then tick the items to rotate (order = slide order).',
      tip: 'If no spotlight items are selected, the site falls back to items marked Featured in Inventory.',
    },
  },
  {
    id: 'listing',
    label: 'Listing',
    title: 'Listing & cards',
    summary:
      'How the catalog grid looks: card layout, colors, image framing, filters, search, and which fields appear on each card.',
    guide: {
      purpose:
        'Control browsing density and what shoppers see at a glance — without editing every inventory item.',
      when:
        'Adjust when branding changes, cards feel too busy/empty, or search/filter behaviour needs to match how customers look for items.',
      how: 'Set layout & columns first, then colors and media fit, then toggle which filter/search/card fields are available.',
      tip: 'Card image fill and inset only affect listing cards. Quick view / Inventory media studio still control popup product fit.',
    },
  },
  {
    id: 'popup',
    label: 'Quick view',
    title: 'Quick view popup',
    summary:
      'The modal that opens when someone clicks Quick view on a card — template, visible blocks, and gallery shadow.',
    guide: {
      purpose:
        'Let visitors inspect media, specs, and CTAs without leaving the listing page.',
      when:
        'Change template when you want a different look (e.g. Showcase for the reference product layout). Toggle components when marketing wants a simpler or richer popup.',
      how: 'Pick a template, enable only the components you need, set Classic layout if using Classic, then choose gallery frame shadow.',
      tip: 'Showcase expects media + CTA on the left and content/trust on the right. Prefer Popup components over legacy modal fields.',
    },
  },
  {
    id: 'discovery',
    label: 'Discovery',
    title: 'Discovery experience',
    summary:
      'Extras that help visitors find items faster: profile rails, facets, grouped results, and toolbar chips.',
    guide: {
      purpose:
        'Reduce friction on large catalogs so users can browse by profile, refine by facet, or scan grouped categories.',
      when:
        'Enable on catalogs with many items or clear segments. Keep off for small catalogs where a simple search + grid is enough.',
      how: 'Toggle the features you want live, set group preview count if grouped results are on, then choose which toolbar pieces show.',
      tip: 'Each discovery feature is independent — start with sticky toolbar + search, then add rails only if the page still feels scannable.',
    },
  },
  {
    id: 'categories',
    label: 'Categories',
    title: 'Categories',
    summary: 'Taxonomy labels used for filters, grouping, and card badges on this catalog type.',
    guide: {
      purpose:
        'Organise inventory into browsable groups customers recognise (e.g. UPS, Switchgear, Services).',
      when:
        'Add categories before seeding many items, or whenever a new product family needs its own filter chip.',
      how: 'Enter a name and Add. Disable instead of delete if items still reference the category. Assign items to categories in Inventory.',
      tip: 'Slug is generated from the name and used in URLs/filters — rename carefully on live sites.',
    },
  },
];

export const CATALOG_SETTINGS_BLOCKS: Record<string, { title: string; guide: SettingsGuide }> = {
  hero_presentation: {
    title: 'Presentation',
    guide: {
      purpose: 'Define the hero’s look and the main copy visitors read first.',
      when: 'Update for seasonal campaigns, rebrands, or when the headline/message should change.',
      how: 'Choose visual style and variant, then fill eyebrow, title, lead, and rotation speed.',
      tip: 'Spotlight variant emphasises one featured card; Standard keeps copy more compact with an optional panel.',
    },
  },
  hero_elements: {
    title: 'Elements',
    guide: {
      purpose: 'Show or hide individual hero pieces without switching templates.',
      when: 'Use when the hero feels cluttered, or when you need meta/tags/actions for a campaign.',
      how: 'Toggle chips on/off. standard_panel / spotlight only control the featured-item shell for that variant.',
      tip: 'eyebrow, title, lead, meta, kicker, price, tags, actions, and dots apply across every visual style.',
    },
  },
  hero_spotlight_items: {
    title: 'Spotlight items',
    guide: {
      purpose: 'Hand-pick which inventory items appear in the rotating hero.',
      when: 'Use for launches, bestsellers, or a short curated set. Leave empty to auto-use Featured items.',
      how: 'Tick items to include. Use ↑ ↓ to set slide order (top of list plays first).',
      tip: 'Only published/enabled items should be curated — draft items may not appear publicly.',
    },
  },
  listing_layout: {
    title: 'Layout',
    guide: {
      purpose:
        'Control card composition, columns, and whether listing tiles use content-driven or equal fixed heights.',
      when:
        'Change when desktop density feels wrong, marketing wants text over the image, or uneven card heights look untidy.',
      how: 'Marketplace = image on top, details below (recommended). Overlay = text on media. Grid columns 2–4 work best on desktop. Card size Auto = current behaviour; Fixed = pick a uniform height.',
      tip: 'List layout is better for long summaries; grid is better for visual browsing. Use Fixed when you want a precise corporate lineup.',
    },
  },
  listing_colors: {
    title: 'Colors',
    guide: {
      purpose: 'Align card and listing surfaces with brand without editing CSS.',
      when: 'Use for brand refreshes or to fix contrast (e.g. white products on white cards).',
      how: 'Pick a colour or paste a hex. Card media background also fills the Quick view gallery behind the product.',
      tip: 'Marketplace hover border is the accent outline on card hover — often match brand orange.',
    },
  },
  listing_media: {
    title: 'Media fit',
    guide: {
      purpose: 'Frame product photos consistently on listing cards.',
      when: 'Use when images look cropped, tiny, or uneven across the grid.',
      how: 'Raise fill % toward 100 for edge-to-edge cover. Use inset for breathing room around the product.',
      tip: 'Does not change Inventory “product fit” inside Quick view — that stays per-item in Media studio.',
    },
  },
  listing_fields: {
    title: 'Fields',
    guide: {
      purpose: 'Decide what customers can filter/search by, and what each card displays.',
      when: 'Tighten cards when they feel noisy; expand when buyers need price, availability, or tags at a glance.',
      how: 'Enable Filters and Search fields customers actually use. Under card fields, keep media + title + one CTA as a minimum.',
      tip: 'Quick view and Detail page link are separate CTAs — enable both only if the journey needs both paths.',
    },
  },
  popup_template: {
    title: 'Template',
    guide: {
      purpose: 'Sets the overall Quick view chrome and composition.',
      when: 'Switch when the current popup feels dated or does not match a design reference.',
      how: 'Classic = system default. Vitrine = bright editorial. Lumen/Horizon = darker/futuristic. Showcase = reference product layout.',
      tip: 'After changing template, review Components — some pieces (e.g. gallery dots) matter most on Showcase.',
    },
  },
  popup_components: {
    title: 'Components',
    guide: {
      purpose: 'Independently show/hide every block inside the Quick view popup.',
      when: 'Use to simplify (hide trust/tags) or enrich (show specs, quote CTA) without a code change.',
      how: 'Chrome = close/badge/ref. Content = media, title, specs, trust. CTA = intro copy, profile, quote, contact, enquiry drawer.',
      tip: 'Request a quote can open the enquiry drawer even if other CTAs are off — keep Enquiry drawer on if quotes should submit.',
    },
  },
  popup_classic_layout: {
    title: 'Classic layout',
    guide: {
      purpose: 'Choose how media and content split inside the Classic template only.',
      when: 'Only relevant when Template = Classic. Ignored (dimmed) for other templates.',
      how: 'Pick the composition that best matches your media aspect ratios and copy length.',
      tip: 'If you use Showcase/Vitrine/Lumen/Horizon, you can ignore this block.',
    },
  },
  popup_shadow: {
    title: 'Gallery shadow',
    guide: {
      purpose: 'Controls the drop shadow on the Quick view main image frame.',
      when: 'Tune when the product looks flat against the stage, or when shadow feels too heavy.',
      how: 'Choose a preset from soft → strong / specialty styles. Applies to `.catalog-gallery-main` in the popup.',
      tip: 'Listing card frame shadow is set per item in Inventory → Media (background/frame), not here.',
    },
  },
  discovery_features: {
    title: 'Features',
    guide: {
      purpose: 'Optional discovery modules on the public listing page.',
      when: 'Enable for large or segmented catalogs; disable to keep the page simple.',
      how: 'Toggle each module. Grouped results pairs well with Categories. Sticky toolbar helps long scrolling pages.',
      tip: 'Too many rails at once can overwhelm — enable one, Save, preview the public page, then add more.',
    },
  },
  discovery_toolbar: {
    title: 'Toolbar & grouping',
    guide: {
      purpose: 'Fine-tune the search toolbar and how many cards show per group.',
      when: 'Adjust after enabling discovery features, or when the toolbar shows controls nobody uses.',
      how: 'Set group preview count (cards before “View all”). Toggle toolbar elements such as search, sort, chips, clear.',
      tip: 'Group preview count only applies when Grouped results is enabled.',
    },
  },
};

/** Friendlier chip labels for hero elements */
export const HERO_ELEMENT_LABELS: Record<string, string> = {
  eyebrow: 'Eyebrow label',
  title: 'Title',
  lead: 'Lead paragraph',
  meta: 'Meta chips (style/variant)',
  standard_panel: 'Standard featured panel',
  spotlight: 'Spotlight featured card',
  kicker: 'Kicker (type label)',
  price: 'Price / stat on featured',
  tags: 'Tags',
  actions: 'Action buttons',
  dots: 'Carousel dots',
};

export const TOOLBAR_ELEMENT_LABELS: Record<string, string> = {
  search: 'Search box',
  sort: 'Sort control',
  result_meta: 'Result count',
  filter_chips: 'Active filter chips',
  clear: 'Clear filters',
};

export const FILTER_LABELS: Record<string, string> = {
  category: 'Category filter',
  tags: 'Tags filter',
};

export const SEARCH_FIELD_LABELS: Record<string, string> = {
  title: 'Title',
  summary: 'Summary',
  description: 'Description',
  tags: 'Tags',
  price_label: 'Price label',
};
