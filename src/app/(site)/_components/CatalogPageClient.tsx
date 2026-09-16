'use client';

import { useEffect, useMemo, useState, useCallback, useRef, type CSSProperties } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type {
  CatalogItem,
  CatalogCategory,
  CatalogItemType,
  CatalogPageSettings,
  CatalogFacets,
} from '@/lib/types';
import { applyDocumentSeo } from '@/components/SiteSeo';
import CatalogDetailModal from '@/components/CatalogDetailModal';
import { useScrollReveal } from '@/lib/use-scroll-reveal';
import { catalogPublicPath, caseStudyLabel } from '@/lib/catalog-case-study';
import { Suspense } from 'react';
import { publicMediaUrl } from '@/lib/media-url';
import { heroHas, toolbarHas } from '@/lib/catalog-page-elements';

type Props = {
  itemType: CatalogItemType;
  title: string;
  eyebrow: string;
  lead: string;
};

const DEFAULT_CARD = ['title', 'summary', 'category', 'primary_image', 'price_label', 'quick_view', 'case_study_link'];
const DEFAULT_MODAL = ['title', 'description', 'specs', 'media', 'enquiry'];
const INTENT_CHIP_LIMIT = 8;

function hasField(fields: string[] | null | undefined, name: string, fallback: string[]) {
  const list = fields?.length ? fields : fallback;
  return list.includes(name);
}

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

/** Escape a public media path for use inside CSS url("…"). */
function cssUrlValue(path: string): string {
  const resolved = publicMediaUrl(path);
  if (!resolved) return '';
  return encodeURI(resolved)
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function CatalogCardMedia({ item }: { item: CatalogItem }) {
  const bgCss = item.background_image_url?.trim() ? cssUrlValue(item.background_image_url) : '';
  const style = bgCss
    ? ({ ['--catalog-card-bg']: `url("${bgCss}")` } as CSSProperties)
    : undefined;

  return (
    <div className={cx('catalog-card-media', bgCss && 'catalog-card-media--has-bg')} style={style}>
      {item.primary_image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={publicMediaUrl(item.primary_image)} alt={item.title} loading="lazy" />
      ) : null}
    </div>
  );
}

function CatalogHero({
  itemType,
  title,
  eyebrow,
  lead,
  settings,
  heroItems,
  onOpenItem,
}: {
  itemType: CatalogItemType;
  title: string;
  eyebrow: string;
  lead: string;
  settings: CatalogPageSettings | null;
  heroItems: CatalogItem[];
  onOpenItem: (item: CatalogItem) => void;
}) {
  const [current, setCurrent] = useState(0);
  const slides = heroItems.length ? heroItems : [];
  const autoplayMs = Math.max(2500, Number(settings?.hero_autoplay_ms || 6000));
  const heroEnabled = settings?.hero_enabled !== 0 && slides.length > 0;

  useEffect(() => {
    setCurrent(0);
  }, [itemType, slides.length]);

  useEffect(() => {
    if (!heroEnabled || slides.length < 2) return;
    const timer = window.setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, autoplayMs);
    return () => window.clearInterval(timer);
  }, [autoplayMs, heroEnabled, slides.length]);

  if (!heroEnabled) {
    return (
      <section className="page-hero" style={{ minHeight: 'auto', padding: '10rem 0 4rem' }}>
        <div className="hero-bg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/images/engineers-reviewing-electrical-design-dr.jpg" alt="" />
          <div className="hero-overlay"></div>
          <div className="grid-overlay"></div>
        </div>
        <div className="container">
          <div className="section-head">
            <div className="eyebrow">{eyebrow}</div>
            <h1>{title}</h1>
            <p className="lead">{lead}</p>
          </div>
        </div>
      </section>
    );
  }

  const active = slides[current] || slides[0];
  const heroEyebrow = settings?.hero_eyebrow?.trim() || eyebrow;
  const heroTitle = settings?.hero_title?.trim() || title;
  const heroLead = settings?.hero_lead?.trim() || lead;
  const variant = settings?.hero_variant || 'spotlight';
  const revealEnabled = settings?.reveal_animation_enabled !== 0;

  return (
    <section className={cx('page-hero catalog-hero', `catalog-hero--${variant}`)}>
      <div className="hero-bg catalog-hero-bg">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={active.primary_image || '/assets/images/engineers-reviewing-electrical-design-dr.jpg'} alt="" />
        <div className="hero-overlay"></div>
        <div className="grid-overlay"></div>
        <div className="catalog-hero-tint"></div>
      </div>
      <div className={cx('container catalog-hero-layout', variant === 'standard' && 'catalog-hero-layout--standard')}>
        <div className={cx('catalog-hero-copy', revealEnabled && 'reveal')}>
          {heroHas(settings, 'eyebrow') ? <div className="eyebrow">{heroEyebrow}</div> : null}
          {heroHas(settings, 'title') ? <h1>{heroTitle}</h1> : null}
          {heroHas(settings, 'lead') ? <p className="lead">{heroLead}</p> : null}
          {heroHas(settings, 'meta') ? (
            <div className="catalog-hero-meta">
              <span>{slides.length} curated highlights</span>
              <span>Autoplay {Math.round(autoplayMs / 1000)}s</span>
              <span>{itemType}s</span>
            </div>
          ) : null}
          {variant === 'standard' && heroHas(settings, 'standard_panel') ? (
            <div className="catalog-hero-standard-panel">
              {heroHas(settings, 'kicker') ? (
                <span className="catalog-hero-kicker">{active.category_name || active.item_type}</span>
              ) : null}
              <h2>{active.title}</h2>
              <p>{active.summary || active.description || `Explore this ${itemType} in more detail.`}</p>
              {heroHas(settings, 'actions') ? (
                <div className="catalog-hero-actions">
                  <button type="button" className="btn btn-primary" onClick={() => onOpenItem(active)}>
                    View details
                  </button>
                  <a href="/contact" className="btn btn-ghost-dark">
                    Contact team
                  </a>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        {variant === 'spotlight' && heroHas(settings, 'spotlight') ? (
        <div className={cx('catalog-hero-spotlight', revealEnabled && 'reveal')}>
          <div className="catalog-hero-spotlight-top">
            {heroHas(settings, 'kicker') ? (
              <span className="catalog-hero-kicker">{active.category_name || active.item_type}</span>
            ) : null}
            {heroHas(settings, 'price') && active.price_label ? (
              <span className="catalog-hero-price">{active.price_label}</span>
            ) : null}
          </div>
          <h2>{active.title}</h2>
          <p>{active.summary || active.description || `Explore this ${itemType} in more detail.`}</p>
          {heroHas(settings, 'tags') && active.tags_json?.length ? (
            <div className="catalog-hero-tags">
              {active.tags_json.slice(0, 4).map((tagValue) => (
                <span key={tagValue} className="catalog-hero-tag">
                  {tagValue}
                </span>
              ))}
            </div>
          ) : null}
          {heroHas(settings, 'actions') ? (
            <div className="catalog-hero-actions">
              <button type="button" className="btn btn-primary" onClick={() => onOpenItem(active)}>
                View spotlight
              </button>
              <Link href={catalogPublicPath(itemType, active.slug)} className="btn btn-ghost-dark">
                Full {caseStudyLabel(itemType).toLowerCase()}
              </Link>
              <a href="/contact" className="btn btn-ghost-dark">
                Talk to sales
              </a>
            </div>
          ) : null}
          {heroHas(settings, 'dots') && slides.length > 1 ? (
            <div className="catalog-hero-dots" aria-label="Spotlight items">
              {slides.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  className={index === current ? 'active' : ''}
                  aria-label={`Show ${item.title}`}
                  onClick={() => setCurrent(index)}
                />
              ))}
            </div>
          ) : null}
        </div>
        ) : null}
        {heroHas(settings, 'dots') &&
        slides.length > 1 &&
        variant === 'standard' &&
        heroHas(settings, 'standard_panel') ? (
          <div className="catalog-hero-standard-dots" aria-label="Spotlight items">
            {slides.map((item, index) => (
              <button
                key={item.id}
                type="button"
                className={index === current ? 'active' : ''}
                aria-label={`Show ${item.title}`}
                onClick={() => setCurrent(index)}
              />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function CatalogLoadingSkeleton({
  layout,
  columns,
}: {
  layout: 'grid' | 'list';
  columns: number;
}) {
  return (
    <div
      className={layout === 'list' ? 'catalog-list catalog-skeleton-list' : 'proj-grid catalog-skeleton-grid'}
      style={layout === 'list' ? { display: 'grid', gap: '1rem' } : { gridTemplateColumns: `repeat(${columns}, 1fr)` }}
    >
      {Array.from({ length: layout === 'list' ? 4 : Math.max(columns, 3) }).map((_, index) => (
        <div
          key={index}
          className={cx(
            'catalog-card',
            layout === 'list' ? 'catalog-card--list' : 'catalog-card--tile',
            'catalog-skeleton-card',
            layout === 'list' && 'catalog-skeleton-card--list'
          )}
        >
          <div className="catalog-card-media catalog-skeleton-media" />
          <div className="catalog-card-body">
            <div className="catalog-skeleton-line catalog-skeleton-line--short" />
            <div className="catalog-skeleton-line catalog-skeleton-line--mid" />
            <div className="catalog-skeleton-line" />
          </div>
        </div>
      ))}
    </div>
  );
}

function CatalogItemCard({
  item,
  itemType,
  cardFields,
  layout,
  revealEnabled,
  delayMs,
  onOpen,
}: {
  item: CatalogItem;
  itemType: CatalogItemType;
  cardFields: string[];
  layout: 'grid' | 'list';
  revealEnabled: boolean;
  delayMs?: number;
  onOpen: (item: CatalogItem) => void;
}) {
  return (
    <button
      type="button"
      className={cx(
        'catalog-card',
        layout === 'list' ? 'catalog-card--list' : 'catalog-card--tile',
        revealEnabled && 'reveal'
      )}
      onClick={() => onOpen(item)}
      style={{ transitionDelay: revealEnabled && delayMs != null ? `${delayMs}ms` : undefined }}
    >
      {hasField(cardFields, 'primary_image', DEFAULT_CARD) ? <CatalogCardMedia item={item} /> : null}
      <div className="catalog-card-body">
        {hasField(cardFields, 'category', DEFAULT_CARD) ? (
          <div className="catalog-card-eyebrow">{item.category_name || item.item_type.toUpperCase()}</div>
        ) : null}
        {hasField(cardFields, 'title', DEFAULT_CARD) ? <h5>{item.title}</h5> : null}
        {hasField(cardFields, 'price_label', DEFAULT_CARD) && item.price_label ? (
          <div className="catalog-card-stat">{item.price_label}</div>
        ) : null}
        {hasField(cardFields, 'summary', DEFAULT_CARD) ? <p>{item.summary}</p> : null}
        {hasField(cardFields, 'tags', DEFAULT_CARD) && item.tags_json?.length ? (
          <p className="catalog-card-tags">{item.tags_json.join(' · ')}</p>
        ) : null}
        {hasField(cardFields, 'quick_view', DEFAULT_CARD) ? (
          <span className="catalog-card-link">Quick view →</span>
        ) : null}
        {hasField(cardFields, 'case_study_link', DEFAULT_CARD) ? (
          <Link
            href={catalogPublicPath(itemType, item.slug)}
            className="catalog-card-page-link"
            onClick={(e) => e.stopPropagation()}
          >
            {caseStudyLabel(itemType)} page →
          </Link>
        ) : null}
      </div>
    </button>
  );
}

export default function CatalogPageClient(props: Props) {
  return (
    <Suspense
      fallback={
        <main className="catalog-page">
          <div className="container" style={{ padding: '4rem 0' }}>
            Loading…
          </div>
        </main>
      }
    >
      <CatalogPageClientInner {...props} />
    </Suspense>
  );
}

function CatalogPageClientInner({ itemType, title, eyebrow, lead }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const resultsRef = useRef<HTMLDivElement | null>(null);

  const q = searchParams.get('q') || '';
  const category = searchParams.get('category') || '';
  const tag = searchParams.get('tag') || '';
  const sort = (searchParams.get('sort') || 'featured') as 'featured' | 'newest' | 'title';

  const [items, setItems] = useState<CatalogItem[]>([]);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [facets, setFacets] = useState<CatalogFacets | null>(null);
  const [settings, setSettings] = useState<CatalogPageSettings | null>(null);
  const [heroItems, setHeroItems] = useState<CatalogItem[]>([]);
  const [searchDraft, setSearchDraft] = useState(q);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [active, setActive] = useState<CatalogItem | null>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const filters = settings?.filters_json || ['category', 'tags'];
  const cardFields = settings?.card_fields_json || DEFAULT_CARD;
  const modalFields = settings?.modal_fields_json || DEFAULT_MODAL;
  const layout = settings?.layout || 'grid';
  const gridColumns = Number(settings?.grid_columns || 3);
  const revealEnabled = settings?.reveal_animation_enabled !== 0;
  const showSkeleton = settings?.loading_skeleton_enabled !== 0;
  const stylePreset = settings?.visual_style || 'premium';
  const premiumBordersEnabled = settings?.premium_borders_enabled !== 0;
  const profileRailEnabled = settings?.discovery_profile_rail_enabled !== 0;
  const quickFindEnabled = settings?.discovery_quick_find_enabled !== 0;
  const facetRailEnabled = settings?.discovery_facet_rail_enabled !== 0;
  const groupedResultsEnabled = settings?.discovery_grouped_results_enabled !== 0;
  const stickyToolbarEnabled = settings?.discovery_sticky_toolbar_enabled !== 0;
  const groupPreviewCount = Math.min(
    12,
    Math.max(1, Number(settings?.discovery_group_preview_count || 4) || 4)
  );
  const showCategoryFilters = filters.includes('category') || (facets?.categories.length ?? 0) > 0;
  const showTagFilters = filters.includes('tags') || (facets?.tags.length ?? 0) > 0;

  const scrollToResults = useCallback(() => {
    window.requestAnimationFrame(() => {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, []);

  const setFilterParam = useCallback(
    (key: 'q' | 'category' | 'tag' | 'sort', value: string, opts?: { scroll?: boolean }) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && !(key === 'sort' && value === 'featured')) params.set(key, value);
      else if (key === 'sort' && value === 'featured') params.delete(key);
      else if (!value) params.delete(key);
      else params.set(key, value);
      const next = params.toString();
      router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
      if (opts?.scroll !== false && key !== 'sort' && key !== 'q') scrollToResults();
    },
    [pathname, router, searchParams, scrollToResults]
  );

  const clearFilters = useCallback(() => {
    setSearchDraft('');
    router.replace(pathname, { scroll: false });
    scrollToResults();
  }, [pathname, router, scrollToResults]);

  useScrollReveal(
    revealEnabled
      ? `${itemType}-${layout}-${items.length}-${stylePreset}-${sort}-${category}-${tag}-${q}-${loading}`
      : `disabled-${itemType}`
  );

  useEffect(() => {
    setSearchDraft(q);
  }, [q]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      if (searchDraft === q) return;
      setFilterParam('q', searchDraft.trim(), { scroll: false });
    }, 300);
    return () => window.clearTimeout(handle);
  }, [searchDraft, q, setFilterParam]);

  useEffect(() => {
    fetch('/api/public/site-settings')
      .then(async (r) => (r.ok ? r.json() : null))
      .then((data) => {
        applyDocumentSeo({
          title: `${title} | ${data?.settings?.companyName || 'Zigma Technologies'}`,
          description: lead || data?.settings?.defaultMetaDescription,
          image: data?.settings?.ogImage,
          siteName: data?.settings?.companyName,
        });
      })
      .catch(() => undefined);
  }, [title, lead]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (category) params.set('category', category);
    if (tag) params.set('tag', tag);
    if (sort && sort !== 'featured') params.set('sort', sort);
    setLoading(true);
    setError('');
    fetch(`/api/public/catalog/${itemType}?${params.toString()}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || 'Failed to load');
        setItems(data.items);
        setCategories(data.categories);
        setFacets(data.facets || null);
        setHeroItems(data.heroItems || []);
        if (data.settings) setSettings(data.settings);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [itemType, q, category, tag, sort]);

  async function openItem(item: CatalogItem) {
    const { trackEvent } = await import('@/lib/analytics');
    trackEvent('catalog_open', { item_type: itemType, slug: item.slug });
    const res = await fetch(`/api/public/catalog/${itemType}/${item.slug}`);
    const data = await res.json();
    if (res.ok) setActive(data.item);
    else setActive(item);
  }

  useEffect(() => {
    const slug = searchParams.get('item');
    if (!slug || loading || active) return;
    const match = items.find((i) => i.slug === slug);
    if (match) {
      void openItem(match);
      return;
    }
    if (!items.length) return;
    void fetch(`/api/public/catalog/${itemType}/${slug}`)
      .then(async (r) => {
        const data = await r.json();
        if (r.ok && data.item) setActive(data.item);
      })
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, items, itemType, searchParams]);

  const columns = useMemo(
    () => Math.min(gridColumns, Math.max(1, items.length || 1)),
    [items.length, gridColumns]
  );
  const heroSlides = useMemo(() => {
    if (heroItems.length) return heroItems;
    const featured = items.filter((item) => item.featured);
    return (featured.length ? featured : items).slice(0, 4);
  }, [heroItems, items]);
  const pageClassName = cx(
    'catalog-page',
    `catalog-style-${stylePreset}`,
    premiumBordersEnabled && 'catalog-premium-borders',
    revealEnabled && 'catalog-reveal-enabled'
  );

  const facetCategories = facets?.categories?.length
    ? facets.categories
    : categories.map((c) => ({ slug: c.slug, name: c.name, count: 0, sort_order: c.sort_order }));
  const facetTags = facets?.tags || [];
  const intentTags = facetTags.slice(0, INTENT_CHIP_LIMIT);
  const facetTotal = facets?.total ?? items.length;

  const activeCategoryName =
    facetCategories.find((c) => c.slug === category)?.name ||
    categories.find((c) => c.slug === category)?.name;
  const hasActiveFilters = Boolean(category || tag || q);
  const useGroupedView = groupedResultsEnabled && !category && !tag && !q;

  const groupedSections = useMemo(() => {
    if (!useGroupedView) return [];
    const bySlug = new Map<string, CatalogItem[]>();
    for (const item of items) {
      const slug = item.category_slug || '_other';
      const list = bySlug.get(slug) || [];
      list.push(item);
      bySlug.set(slug, list);
    }
    const ordered = facetCategories
      .filter((c) => (bySlug.get(c.slug)?.length || 0) > 0)
      .map((c) => ({
        slug: c.slug,
        name: c.name,
        items: bySlug.get(c.slug) || [],
      }));
    const other = bySlug.get('_other');
    if (other?.length) ordered.push({ slug: '_other', name: 'Other', items: other });
    return ordered;
  }, [useGroupedView, items, facetCategories]);

  function selectCategory(slug: string) {
    setFilterParam('category', category === slug ? '' : slug);
    setMobileFiltersOpen(false);
  }

  function selectTag(value: string) {
    setFilterParam('tag', tag === value ? '' : value);
    setMobileFiltersOpen(false);
  }

  const gridStyle =
    layout === 'list'
      ? ({ display: 'grid', gap: '1rem' } as CSSProperties)
      : ({ gridTemplateColumns: `repeat(${Math.min(gridColumns, columns)}, 1fr)` } as CSSProperties);

  return (
    <main id="main-content" className={pageClassName}>
      <CatalogHero
        itemType={itemType}
        title={title}
        eyebrow={eyebrow}
        lead={lead}
        settings={settings}
        heroItems={heroSlides}
        onOpenItem={(item) => void openItem(item)}
      />

      <section className="section section-light catalog-listing">
        <div className="container">
          {profileRailEnabled && showCategoryFilters ? (
            <div className="catalog-profile-rail" aria-label={`${itemType} profiles`}>
              <div className="catalog-profile-rail-head">
                <span className="catalog-profile-rail-kicker">Shop by profile</span>
                <p>One tap to jump straight to the right {itemType} group.</p>
              </div>
              <div className="catalog-profile-rail-track" role="list">
                <button
                  type="button"
                  role="listitem"
                  className={cx('catalog-profile-tile', !category && 'is-active')}
                  onClick={() => {
                    setFilterParam('category', '');
                    scrollToResults();
                  }}
                  aria-pressed={!category}
                >
                  <span className="catalog-profile-tile-name">All {itemType}s</span>
                  <span className="catalog-profile-tile-count">{facetTotal}</span>
                </button>
                {facetCategories.map((c) => (
                  <button
                    key={c.slug}
                    type="button"
                    role="listitem"
                    className={cx('catalog-profile-tile', category === c.slug && 'is-active')}
                    onClick={() => selectCategory(c.slug)}
                    aria-pressed={category === c.slug}
                    disabled={c.count === 0 && category !== c.slug}
                  >
                    <span className="catalog-profile-tile-name">{c.name}</span>
                    <span className="catalog-profile-tile-count">{c.count}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {quickFindEnabled && showTagFilters && intentTags.length > 0 ? (
            <div className="catalog-intent-row" aria-label="Quick needs">
              <span className="catalog-intent-label">Quick find</span>
              <div className="catalog-intent-chips">
                {intentTags.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    className={cx('catalog-intent-chip', tag === t.value && 'is-active')}
                    onClick={() => selectTag(t.value)}
                    aria-pressed={tag === t.value}
                  >
                    {t.value}
                    <span>{t.count}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div
            className={cx('catalog-toolbar', stickyToolbarEnabled && 'catalog-toolbar--sticky')}
            ref={resultsRef}
            id="catalog-results"
          >
            <div className="catalog-toolbar-controls">
              {toolbarHas(settings, 'search') ? (
                <label className="catalog-toolbar-search">
                  <span className="sr-only">Search {itemType}s</span>
                  <input
                    className="catalog-toolbar-input"
                    placeholder={`Search ${itemType}s…`}
                    value={searchDraft}
                    onChange={(e) => setSearchDraft(e.target.value)}
                  />
                </label>
              ) : null}
              {facetRailEnabled && (showCategoryFilters || showTagFilters) ? (
                <button
                  type="button"
                  className="catalog-toolbar-filters-btn"
                  onClick={() => setMobileFiltersOpen((open) => !open)}
                  aria-expanded={mobileFiltersOpen}
                >
                  Filters
                </button>
              ) : null}
              {toolbarHas(settings, 'sort') ? (
                <select
                  className="catalog-toolbar-select"
                  value={sort === 'newest' || sort === 'title' ? sort : 'featured'}
                  onChange={(e) => setFilterParam('sort', e.target.value, { scroll: false })}
                  aria-label="Sort catalog"
                >
                  <option value="featured">Sort: Featured</option>
                  <option value="newest">Sort: Newest</option>
                  <option value="title">Sort: Title A–Z</option>
                </select>
              ) : null}
              {toolbarHas(settings, 'clear') && hasActiveFilters ? (
                <button type="button" className="catalog-toolbar-clear" onClick={clearFilters}>
                  Clear
                </button>
              ) : null}
              {toolbarHas(settings, 'result_meta') ? (
                <p className="catalog-toolbar-meta">
                  <span className="catalog-toolbar-kicker">Showing</span>
                  {hasActiveFilters ? (
                    <span className="catalog-toolbar-scope">
                      {activeCategoryName ? <strong>{activeCategoryName}</strong> : null}
                      {tag ? (
                        <>
                          {activeCategoryName ? ' · ' : null}
                          tagged <strong>{tag}</strong>
                        </>
                      ) : null}
                      {q ? (
                        <>
                          {activeCategoryName || tag ? ' · ' : null}
                          matching <strong>&ldquo;{q}&rdquo;</strong>
                        </>
                      ) : null}
                    </span>
                  ) : (
                    <span className="catalog-toolbar-scope">all {itemType}s by group</span>
                  )}
                  <span className="catalog-toolbar-count">
                    {loading ? '…' : `${items.length} ${items.length === 1 ? 'item' : 'items'}`}
                  </span>
                </p>
              ) : null}
            </div>

            {toolbarHas(settings, 'filter_chips') && hasActiveFilters ? (
              <div className="catalog-filter-chips" aria-label="Active filters">
                {activeCategoryName ? (
                  <button
                    type="button"
                    className="catalog-filter-chip"
                    onClick={() => setFilterParam('category', '')}
                  >
                    {activeCategoryName}
                    <span aria-hidden>×</span>
                  </button>
                ) : null}
                {tag ? (
                  <button type="button" className="catalog-filter-chip" onClick={() => setFilterParam('tag', '')}>
                    {tag}
                    <span aria-hidden>×</span>
                  </button>
                ) : null}
                {q ? (
                  <button
                    type="button"
                    className="catalog-filter-chip"
                    onClick={() => {
                      setSearchDraft('');
                      setFilterParam('q', '', { scroll: false });
                    }}
                  >
                    “{q}”
                    <span aria-hidden>×</span>
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>

          <div
            className={cx(
              'catalog-discovery',
              facetRailEnabled && (showCategoryFilters || showTagFilters) && 'catalog-discovery--with-facets',
              mobileFiltersOpen && 'catalog-discovery--filters-open'
            )}
          >
            {facetRailEnabled && (showCategoryFilters || showTagFilters) ? (
            <aside className="catalog-facet-rail" aria-label="Refine catalogue">
              <div className="catalog-facet-rail-panel">
                <div className="catalog-facet-rail-top">
                  <h3>Refine</h3>
                  <button
                    type="button"
                    className="catalog-facet-close"
                    onClick={() => setMobileFiltersOpen(false)}
                  >
                    Done
                  </button>
                </div>

                {showCategoryFilters ? (
                  <div className="catalog-facet-group">
                    <h4>Profiles</h4>
                    <ul>
                      <li>
                        <button
                          type="button"
                          className={cx(!category && 'is-active')}
                          onClick={() => selectCategory('')}
                        >
                          <span>All</span>
                          <span>{facetTotal}</span>
                        </button>
                      </li>
                      {facetCategories.map((c) => (
                        <li key={c.slug}>
                          <button
                            type="button"
                            className={cx(category === c.slug && 'is-active')}
                            onClick={() => selectCategory(c.slug)}
                            disabled={c.count === 0 && category !== c.slug}
                          >
                            <span>{c.name}</span>
                            <span>{c.count}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {showTagFilters && facetTags.length > 0 ? (
                  <div className="catalog-facet-group">
                    <h4>Needs &amp; tags</h4>
                    <ul>
                      {facetTags.map((t) => (
                        <li key={t.value}>
                          <button
                            type="button"
                            className={cx(tag === t.value && 'is-active')}
                            onClick={() => selectTag(t.value)}
                            disabled={t.count === 0 && tag !== t.value}
                          >
                            <span>{t.value}</span>
                            <span>{t.count}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </aside>
            ) : null}

            <div className="catalog-discovery-results">
              {error ? <p style={{ color: '#c9540f' }}>{error}</p> : null}
              {loading && !items.length && showSkeleton ? (
                <CatalogLoadingSkeleton layout={layout} columns={Math.min(gridColumns, 3)} />
              ) : null}
              {loading && !items.length && !showSkeleton ? <p>Loading…</p> : null}

              {!loading && items.length === 0 ? (
                <div className="catalog-empty">
                  <h3>No matches in this view</h3>
                  <p>
                    Try another profile, a Quick find tag, or ask an engineer for a tailored recommendation.
                  </p>
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1rem' }}>
                    <button type="button" className="btn btn-ghost-dark" onClick={clearFilters}>
                      Clear filters
                    </button>
                    <Link href="/contact?consult=1&consult_subject=Request%20a%20Quote" className="btn btn-primary">
                      Request a quote →
                    </Link>
                  </div>
                </div>
              ) : null}

              {!loading && useGroupedView && groupedSections.length > 0 ? (
                <div className="catalog-grouped">
                  {groupedSections.map((section) => {
                    const preview = section.items.slice(0, groupPreviewCount);
                    const remaining = section.items.length - preview.length;
                    return (
                      <section key={section.slug} className="catalog-group">
                        <div className="catalog-group-head">
                          <div>
                            <h3>{section.name}</h3>
                            <p>
                              {section.items.length}{' '}
                              {section.items.length === 1 ? itemType : `${itemType}s`}
                            </p>
                          </div>
                          <button
                            type="button"
                            className="catalog-group-view-all"
                            onClick={() => selectCategory(section.slug === '_other' ? '' : section.slug)}
                          >
                            {remaining > 0
                              ? `View all ${section.items.length} →`
                              : `Open ${section.name} →`}
                          </button>
                        </div>
                        <div
                          className={layout === 'list' ? 'catalog-list' : 'proj-grid'}
                          style={
                            layout === 'list'
                              ? { display: 'grid', gap: '1rem' }
                              : {
                                  gridTemplateColumns: `repeat(${Math.min(gridColumns, preview.length || 1)}, 1fr)`,
                                }
                          }
                        >
                          {preview.map((item, index) => (
                            <CatalogItemCard
                              key={item.id}
                              item={item}
                              itemType={itemType}
                              cardFields={cardFields}
                              layout={layout}
                              revealEnabled={revealEnabled}
                              delayMs={index * 60}
                              onOpen={(next) => void openItem(next)}
                            />
                          ))}
                        </div>
                      </section>
                    );
                  })}
                </div>
              ) : null}

              {!loading && !useGroupedView && items.length > 0 ? (
                <div className={layout === 'list' ? 'catalog-list' : 'proj-grid'} style={gridStyle}>
                  {items.map((item, index) => (
                    <CatalogItemCard
                      key={item.id}
                      item={item}
                      itemType={itemType}
                      cardFields={cardFields}
                      layout={layout}
                      revealEnabled={revealEnabled}
                      delayMs={index * 60}
                      onOpen={(next) => void openItem(next)}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {mobileFiltersOpen && facetRailEnabled ? (
        <button
          type="button"
          className="catalog-facet-backdrop"
          aria-label="Close filters"
          onClick={() => setMobileFiltersOpen(false)}
        />
      ) : null}

      {active ? (
        <CatalogDetailModal
          item={active}
          itemType={itemType}
          modalFields={modalFields}
          onClose={() => setActive(null)}
        />
      ) : null}
    </main>
  );
}
