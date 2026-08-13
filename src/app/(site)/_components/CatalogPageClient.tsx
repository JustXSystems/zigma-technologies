'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { CatalogItem, CatalogCategory, CatalogItemType, CatalogPageSettings } from '@/lib/types';
import { applyDocumentSeo } from '@/components/SiteSeo';
import CatalogDetailModal from '@/components/CatalogDetailModal';
import { useScrollReveal } from '@/lib/use-scroll-reveal';
import { catalogPublicPath, caseStudyLabel } from '@/lib/catalog-case-study';
import { Suspense } from 'react';
import SmartImage from '@/components/SmartImage';

type Props = {
  itemType: CatalogItemType;
  title: string;
  eyebrow: string;
  lead: string;
};

const DEFAULT_CARD = ['title', 'summary', 'category', 'primary_image', 'price_label'];
const DEFAULT_MODAL = ['title', 'description', 'specs', 'media', 'enquiry'];

function hasField(fields: string[] | null | undefined, name: string, fallback: string[]) {
  const list = fields?.length ? fields : fallback;
  return list.includes(name);
}

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
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
          <div className="eyebrow">{heroEyebrow}</div>
          <h1>{heroTitle}</h1>
          <p className="lead">{heroLead}</p>
          <div className="catalog-hero-meta">
            <span>{slides.length} curated highlights</span>
            <span>Autoplay {Math.round(autoplayMs / 1000)}s</span>
            <span>{itemType}s</span>
          </div>
          {variant === 'standard' ? (
            <div className="catalog-hero-standard-panel">
              <span className="catalog-hero-kicker">{active.category_name || active.item_type}</span>
              <h2>{active.title}</h2>
              <p>{active.summary || active.description || `Explore this ${itemType} in more detail.`}</p>
              <div className="catalog-hero-actions">
                <button type="button" className="btn btn-primary" onClick={() => onOpenItem(active)}>
                  View details
                </button>
                <a href="/contact" className="btn btn-ghost-dark">
                  Contact team
                </a>
              </div>
            </div>
          ) : null}
        </div>

        {variant === 'spotlight' ? (
        <div className={cx('catalog-hero-spotlight', revealEnabled && 'reveal')}>
          <div className="catalog-hero-spotlight-top">
            <span className="catalog-hero-kicker">{active.category_name || active.item_type}</span>
            {active.price_label ? <span className="catalog-hero-price">{active.price_label}</span> : null}
          </div>
          <h2>{active.title}</h2>
          <p>{active.summary || active.description || `Explore this ${itemType} in more detail.`}</p>
          {active.tags_json?.length ? (
            <div className="catalog-hero-tags">
              {active.tags_json.slice(0, 4).map((tagValue) => (
                <span key={tagValue} className="catalog-hero-tag">
                  {tagValue}
                </span>
              ))}
            </div>
          ) : null}
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
          {slides.length > 1 ? (
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
        {slides.length > 1 && variant === 'standard' ? (
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
        <div key={index} className={cx('proj-card catalog-skeleton-card', layout === 'list' && 'catalog-skeleton-card--list')}>
          <div className="proj-media catalog-skeleton-media" />
          <div className="proj-body">
            <div className="catalog-skeleton-line catalog-skeleton-line--short" />
            <div className="catalog-skeleton-line catalog-skeleton-line--mid" />
            <div className="catalog-skeleton-line" />
          </div>
        </div>
      ))}
    </div>
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

  const q = searchParams.get('q') || '';
  const category = searchParams.get('category') || '';
  const tag = searchParams.get('tag') || '';
  const sort = (searchParams.get('sort') || 'featured') as 'featured' | 'newest' | 'title';

  const [items, setItems] = useState<CatalogItem[]>([]);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [settings, setSettings] = useState<CatalogPageSettings | null>(null);
  const [heroItems, setHeroItems] = useState<CatalogItem[]>([]);
  const [searchDraft, setSearchDraft] = useState(q);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [active, setActive] = useState<CatalogItem | null>(null);

  const filters = settings?.filters_json || ['category', 'tags'];
  const cardFields = settings?.card_fields_json || DEFAULT_CARD;
  const modalFields = settings?.modal_fields_json || DEFAULT_MODAL;
  const layout = settings?.layout || 'grid';
  const gridColumns = Number(settings?.grid_columns || 3);
  const revealEnabled = settings?.reveal_animation_enabled !== 0;
  const showSkeleton = settings?.loading_skeleton_enabled !== 0;
  const stylePreset = settings?.visual_style || 'premium';
  const premiumBordersEnabled = settings?.premium_borders_enabled !== 0;

  const setFilterParam = useCallback(
    (key: 'q' | 'category' | 'tag' | 'sort', value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && !(key === 'sort' && value === 'featured')) params.set(key, value);
      else if (key === 'sort' && value === 'featured') params.delete(key);
      else if (!value) params.delete(key);
      else params.set(key, value);
      const next = params.toString();
      router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  useScrollReveal(revealEnabled ? `${itemType}-${layout}-${items.length}-${stylePreset}` : `disabled-${itemType}`);

  useEffect(() => {
    setSearchDraft(q);
  }, [q]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      if (searchDraft === q) return;
      setFilterParam('q', searchDraft.trim());
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
        setTags(data.tags || []);
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

  const activeCategoryName = categories.find((c) => c.slug === category)?.name;
  const hasActiveFilters = Boolean(category || tag || q);

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

      <section className="section section-light">
        <div className="container">
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem', alignItems: 'center' }}>
            <input
              className="admin-input"
              style={{ background: '#fff', color: '#1e2530', border: '1px solid #e7ebf1', minWidth: 240 }}
              placeholder="Search…"
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
            />
            {filters.includes('category') || categories.length > 0 ? (
              <select
                className="admin-select"
                style={{ background: '#fff', color: '#1e2530', border: '1px solid #e7ebf1' }}
                value={category}
                onChange={(e) => setFilterParam('category', e.target.value)}
              >
                <option value="">All categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            ) : null}
            {filters.includes('tags') || tags.length > 0 ? (
              <select
                className="admin-select"
                style={{ background: '#fff', color: '#1e2530', border: '1px solid #e7ebf1' }}
                value={tag}
                onChange={(e) => setFilterParam('tag', e.target.value)}
              >
                <option value="">All tags</option>
                {tags.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            ) : null}
            <select
              className="admin-select"
              style={{ background: '#fff', color: '#1e2530', border: '1px solid #e7ebf1' }}
              value={sort === 'newest' || sort === 'title' ? sort : 'featured'}
              onChange={(e) => setFilterParam('sort', e.target.value)}
              aria-label="Sort catalog"
            >
              <option value="featured">Sort: Featured</option>
              <option value="newest">Sort: Newest</option>
              <option value="title">Sort: Title A–Z</option>
            </select>
            {hasActiveFilters ? (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setSearchDraft('');
                  router.replace(pathname, { scroll: false });
                }}
              >
                Clear filters
              </button>
            ) : null}
          </div>

          {hasActiveFilters ? (
            <p style={{ margin: '0 0 1.5rem', color: 'var(--graphite-500)', fontSize: '0.92rem' }}>
              Showing
              {activeCategoryName ? (
                <>
                  {' '}
                  <strong>{activeCategoryName}</strong>
                </>
              ) : null}
              {tag ? (
                <>
                  {' '}
                  tagged <strong>{tag}</strong>
                </>
              ) : null}
              {q ? (
                <>
                  {' '}
                  matching <strong>&ldquo;{q}&rdquo;</strong>
                </>
              ) : null}{' '}
              · {loading ? '…' : `${items.length} item${items.length === 1 ? '' : 's'}`}
            </p>
          ) : null}

          {error ? <p style={{ color: '#c9540f' }}>{error}</p> : null}
          {loading && showSkeleton ? <CatalogLoadingSkeleton layout={layout} columns={Math.min(gridColumns, 3)} /> : null}
          {loading && !showSkeleton ? <p>Loading…</p> : null}

          {!loading && items.length === 0 ? (
            <div className="catalog-empty">
              <h3>No matches in this view</h3>
              <p>
                Try clearing filters, browsing all {itemType}s, or ask an engineer for a tailored recommendation.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1rem' }}>
                <button type="button" className="btn btn-ghost-dark" onClick={() => router.replace(pathname)}>
                  Clear filters
                </button>
                <Link href="/contact?consult=1&consult_subject=Request%20a%20Quote" className="btn btn-primary">
                  Request a quote →
                </Link>
              </div>
            </div>
          ) : null}

          {!loading ? (
            <div
              className={layout === 'list' ? 'catalog-list' : 'proj-grid'}
              style={
                layout === 'list'
                  ? { display: 'grid', gap: '1rem' }
                  : { gridTemplateColumns: `repeat(${Math.min(gridColumns, columns)}, 1fr)` }
              }
            >
              {items.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  className={cx('proj-card', revealEnabled && 'reveal')}
                  onClick={() => openItem(item)}
                  style={{
                    textAlign: 'left',
                    cursor: 'pointer',
                    width: '100%',
                    background: 'transparent',
                    padding: 0,
                    display: layout === 'list' ? 'grid' : undefined,
                    gridTemplateColumns: layout === 'list' ? '220px 1fr' : undefined,
                    gap: layout === 'list' ? '1rem' : undefined,
                    alignItems: layout === 'list' ? 'stretch' : undefined,
                    transitionDelay: revealEnabled ? `${index * 60}ms` : undefined,
                  }}
                >
                  {hasField(cardFields, 'primary_image', DEFAULT_CARD) ? (
                    <div className="proj-media" style={layout === 'list' ? { minHeight: 140 } : undefined}>
                      {item.primary_image ? (
                        <SmartImage
                          src={item.primary_image}
                          alt={item.title}
                          fill
                          sizes="(max-width: 768px) 100vw, 33vw"
                          style={{ objectFit: 'cover' }}
                        />
                      ) : null}
                      {hasField(cardFields, 'category', DEFAULT_CARD) ? (
                        <span className="tag">{item.category_name || item.item_type.toUpperCase()}</span>
                      ) : null}
                    </div>
                  ) : null}
                  <div className="proj-body">
                    {hasField(cardFields, 'title', DEFAULT_CARD) ? <h5>{item.title}</h5> : null}
                    {hasField(cardFields, 'price_label', DEFAULT_CARD) && item.price_label ? (
                      <div className="proj-stat">{item.price_label}</div>
                    ) : null}
                    {hasField(cardFields, 'summary', DEFAULT_CARD) ? <p>{item.summary}</p> : null}
                    {hasField(cardFields, 'tags', DEFAULT_CARD) && item.tags_json?.length ? (
                      <p style={{ fontSize: '0.78rem', color: 'var(--graphite-500)' }}>{item.tags_json.join(' · ')}</p>
                    ) : null}
                    <span className="link">Quick view →</span>
                    <Link
                      href={catalogPublicPath(itemType, item.slug)}
                      className="link"
                      style={{ display: 'inline-block', marginTop: '0.45rem', fontSize: '0.82rem' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {caseStudyLabel(itemType)} page →
                    </Link>
                  </div>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </section>

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
