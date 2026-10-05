'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DEFAULT_SITE_SETTINGS, mergeSiteSettings, type SiteSettings } from '@/lib/site-settings';
import {
  AboutSiteSettingsContext,
  AlignButtons,
  ColorInput,
  CtaListEditor,
  Field,
  LinkListEditor,
  PillsEditor,
  SelectInput,
  StyleEditor,
  TextElementEditor,
  TextInput,
  ThemeColorDatalist,
  Toggle,
} from '@/components/admin/about/AboutControls';
import { ColumnsEditor, HighlightEditor, LifeGroup as Group, LifeGroupProvider, NapHint, NumberInput } from '@/components/admin/life/LifeControls';
import { BgMediaGroup, CardStyleFields, LegacyHeaderEditor, SectionBoxGroup } from '@/components/admin/legacy/LegacySectionEditor';
import HeroHeightPicker from '@/components/admin/HeroHeightPicker';
import HeroPlacementEditor from '@/components/admin/HeroPlacementEditor';
import { normalizeLinkItems } from '@/lib/about-sections';
import { HERO_VALIGN_CHOICES } from '@/lib/hero-height';
import {
  withBlogDefaults,
  type BlogCardOptions,
  type BlogCtaContent,
  type BlogFeaturedContent,
  type BlogFeedContent,
  type BlogHeroContent,
  type BlogSectionType,
  type BlogTopicsContent,
} from '@/lib/blog-sections';

type EditorProps<T> = { content: T; onChange: (next: T) => void };

/** Edit a string list with the link-list control (add, reorder, bulk paste). */
function StringListEditor({ label, items, onChange }: { label: string; items: string[]; onChange: (next: string[]) => void }) {
  return (
    <LinkListEditor
      label={label}
      items={(items || []).map((label) => ({ label }))}
      onChange={(next) => onChange(next.map((it) => it.label.trim()).filter(Boolean))}
      withHref={false}
    />
  );
}

function PostsHint() {
  return (
    <p className="az-admin-hint">
      Articles come from <Link href="/admin/resources">Resources / Blog</Link>: write, tag, add a cover image and publish there. Only published,
      visible posts appear on /blog.
    </p>
  );
}

function CardOptionsGroup<T extends BlogCardOptions>({ value, onChange }: { value: T; onChange: (patch: Partial<T>) => void }) {
  return (
    <Group title="Card look" description="What each article card shows, image height and card box style">
      <Field label="Show on each card">
        <Toggle label="Topic badge on the image" checked={value.showTag !== false} onChange={(showTag) => onChange({ showTag } as Partial<T>)} />
        <Toggle label="Date and reading time" checked={value.showMeta !== false} onChange={(showMeta) => onChange({ showMeta } as Partial<T>)} />
        <Toggle label="Excerpt" checked={value.showExcerpt !== false} onChange={(showExcerpt) => onChange({ showExcerpt } as Partial<T>)} />
      </Field>
      <div className="admin-form-grid">
        <TextInput label="Link label" value={value.ctaLabel} onChange={(ctaLabel) => onChange({ ctaLabel } as Partial<T>)} placeholder="Read →" hint="Empty = hidden" />
        <TextInput label="Image height" value={value.mediaHeight} onChange={(mediaHeight) => onChange({ mediaHeight } as Partial<T>)} placeholder="200px" />
      </div>
      <CardStyleFields
        value={value.cardStyle || {}}
        onChange={(patch) => onChange({ cardStyle: { ...(value.cardStyle || {}), ...patch } } as Partial<T>)}
        placeholders={{ background: '#FFFFFF', border: '1px solid rgba(10,22,40,0.08)', radius: '14px', padding: '1.15rem 1.25rem 1.3rem', shadow: '0 1px 2px rgba(10,22,40,0.04)' }}
      />
    </Group>
  );
}

/* ------------------------------------------------------------------ */
/* Hero                                                                */
/* ------------------------------------------------------------------ */

function BlogHeroEditor({ content: c, onChange }: EditorProps<BlogHeroContent>) {
  const set = (patch: Partial<BlogHeroContent>) => onChange({ ...c, ...patch });
  const bc = c.breadcrumb || { items: [], separator: '/' };
  const setBc = (patch: Partial<BlogHeroContent['breadcrumb']>) => set({ breadcrumb: { ...bc, ...patch } });
  const scroll = c.scrollBar || {};
  const ro = c.readout;
  const setRo = (patch: Partial<BlogHeroContent['readout']>) => set({ readout: { ...ro, ...patch } });
  return (
    <>
      <SectionBoxGroup value={c.section} onChange={(section) => set({ section })} />
      <BgMediaGroup value={c.background} onChange={(background) => set({ background })} title="Background slideshow (images / videos)" withIndicators />
      <Group title="Layout, height & motion">
        <div className="admin-form-grid">
          <HeroHeightPicker value={c.heroHeight} fallback="auto" onChange={(heroHeight) => set({ heroHeight })} />
          <HeroPlacementEditor value={c.placement} onChange={(placement) => set({ placement })} />
          <AlignButtons label="Text align" value={c.align} options={['left', 'center']} onChange={(v) => set({ align: (v || undefined) as BlogHeroContent['align'] })} />
          <SelectInput label="Vertical position (full / custom height)" value={c.vAlign || ''} options={HERO_VALIGN_CHOICES} onChange={(v) => set({ vAlign: v || undefined })} />
          <TextInput label="Content max width" value={c.contentMaxWidth} onChange={(contentMaxWidth) => set({ contentMaxWidth })} placeholder="760px" />
          <Field label="Behaviour">
            <Toggle label="Fade-up entrance animation" checked={c.entrance !== false} onChange={(entrance) => set({ entrance })} />
            <Toggle label="Scroll progress bar at the top of the page" checked={!scroll.hidden} onChange={(v) => set({ scrollBar: { ...scroll, hidden: !v } })} />
          </Field>
          <TextInput
            label="Scroll bar color / gradient"
            value={scroll.gradient}
            onChange={(gradient) => set({ scrollBar: { ...scroll, gradient } })}
            placeholder="linear-gradient(90deg,var(--orange),var(--yellow))"
          />
        </div>
      </Group>
      <Group title="Breadcrumb">
        <Toggle label="Show breadcrumb" checked={!bc.hidden} onChange={(v) => setBc({ hidden: !v })} />
        <LinkListEditor label="Crumbs (last one = current page, leave its link empty)" items={normalizeLinkItems(bc.items)} onChange={(items) => setBc({ items })} />
        <div className="admin-form-grid">
          <TextInput label="Separator" value={bc.separator} onChange={(separator) => setBc({ separator })} placeholder="/" />
          <ColorInput label="Current page color" value={bc.currentColor} onChange={(currentColor) => setBc({ currentColor })} fallback="" hint="Empty = same as the links" />
          <ColorInput label="Link hover color" value={bc.hoverColor} onChange={(hoverColor) => setBc({ hoverColor })} fallback="var(--cyan)" />
        </div>
        <StyleEditor title="Breadcrumb style (color, font, size…)" value={bc.style} onChange={(style) => setBc({ style })} allowHide={false} fontSizePlaceholder="0.78rem" />
      </Group>
      <Group title="Eyebrow">
        <TextElementEditor label="Eyebrow" eyebrow siteScale="md" value={c.eyebrow} onChange={(eyebrow) => set({ eyebrow })} hint="Optional; empty = hidden" />
      </Group>
      <Group title="Heading (H1)" open>
        <TextElementEditor label="Heading" multiline headingTag siteRole="pageHero" value={c.title} onChange={(title) => set({ title })} />
        <HighlightEditor value={c.highlight} onChange={(highlight) => set({ highlight })} />
      </Group>
      <Group title="Lead paragraph">
        <TextElementEditor label="Lead" multiline value={c.lead} onChange={(lead) => set({ lead })} />
      </Group>
      <Group title="Chips" description="Short topic chips under the lead">
        <PillsEditor label="Chips" value={c.pills} onChange={(pills) => set({ pills })} />
      </Group>
      <Group title="Buttons">
        <NapHint />
        <CtaListEditor value={c.ctas} onChange={(ctas) => set({ ctas })} />
        <p className="az-admin-hint">Link a button to #blog-feed to scroll to the article list.</p>
      </Group>
      <Group title="Live readout" description="Article count, topic count and latest date, counted from published posts">
        <Toggle label="Show the readout" checked={!ro.hidden} onChange={(v) => setRo({ hidden: !v })} />
        <div className="admin-form-grid">
          <TextInput label="Articles label" value={ro.articlesLabel} onChange={(articlesLabel) => setRo({ articlesLabel })} placeholder="Articles" />
          <TextInput label="Topics label" value={ro.topicsLabel} onChange={(topicsLabel) => setRo({ topicsLabel })} placeholder="Topics" />
          <TextInput label="Latest label" value={ro.latestLabel} onChange={(latestLabel) => setRo({ latestLabel })} placeholder="Latest" />
        </div>
      </Group>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Featured                                                            */
/* ------------------------------------------------------------------ */

function BlogFeaturedEditor({ content: c, onChange }: EditorProps<BlogFeaturedContent>) {
  const set = (patch: Partial<BlogFeaturedContent>) => onChange({ ...c, ...patch });
  return (
    <>
      <SectionBoxGroup value={c.section} onChange={(section) => set({ section })} />
      <Group title="Section header">
        <LegacyHeaderEditor value={c.header} onChange={(header) => set({ header })} />
      </Group>
      <Group title="Which articles" open>
        <PostsHint />
        <div className="admin-form-grid">
          <SelectInput
            label="Pick"
            value={c.mode}
            options={[
              { value: 'latest', label: 'Newest published posts' },
              { value: 'manual', label: 'Hand-picked (slugs below)' },
            ]}
            onChange={(mode) => set({ mode: mode || 'latest' })}
          />
          {c.mode === 'manual' ? null : (
            <NumberInput label="How many" value={c.limit} min={1} max={6} placeholder="3" onChange={(limit) => set({ limit: limit || 3 })} />
          )}
        </div>
        {c.mode === 'manual' ? (
          <StringListEditor label="Post slugs, in order (as shown in Resources / Blog)" items={c.slugs} onChange={(slugs) => set({ slugs })} />
        ) : null}
        <p className="az-admin-hint">The featured strip hides itself while a visitor filters by topic or searches.</p>
      </Group>
      <Group title="Layout">
        <div className="admin-form-grid">
          <SelectInput
            label="Layout"
            value={c.layout}
            options={[
              { value: 'spotlight', label: 'Spotlight: one large card + stacked side cards' },
              { value: 'grid', label: 'Equal grid' },
            ]}
            onChange={(layout) => set({ layout: layout || 'spotlight' })}
          />
          <TextInput label="Gap" value={c.gap} onChange={(gap) => set({ gap })} placeholder="1.25rem" />
          {c.layout === 'grid' ? <ColumnsEditor value={c.columns} onChange={(columns) => set({ columns })} defaults={{ desktop: 3, tablet: 2, mobile: 1 }} /> : null}
        </div>
      </Group>
      <CardOptionsGroup value={c} onChange={set} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Topics                                                              */
/* ------------------------------------------------------------------ */

function BlogTopicsEditor({ content: c, onChange }: EditorProps<BlogTopicsContent>) {
  const set = (patch: Partial<BlogTopicsContent>) => onChange({ ...c, ...patch });
  return (
    <>
      <SectionBoxGroup value={c.section} onChange={(section) => set({ section })} />
      <Group title="Section header" description="Hidden by default; the bar works well on its own">
        <LegacyHeaderEditor value={c.header} onChange={(header) => set({ header })} />
      </Group>
      <Group title="Topics" open>
        <StringListEditor label="Topics, in order (must match post tags exactly)" items={c.topics} onChange={(topics) => set({ topics })} />
        <p className="az-admin-hint">Leave empty to list every tag used by published posts, most used first.</p>
        <div className="admin-form-grid">
          <TextInput label="'All' button label" value={c.allLabel} onChange={(allLabel) => set({ allLabel })} placeholder="All topics" />
          <AlignButtons label="Align" value={c.align} options={['left', 'center']} onChange={(v) => set({ align: (v || undefined) as BlogTopicsContent['align'] })} />
          <Field label="Behaviour">
            <Toggle label="Show post counts" checked={c.showCounts !== false} onChange={(showCounts) => set({ showCounts })} />
            <Toggle label="Stick under the site header while scrolling" checked={c.sticky !== false} onChange={(sticky) => set({ sticky })} />
          </Field>
        </div>
      </Group>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Feed                                                                */
/* ------------------------------------------------------------------ */

function BlogFeedEditor({ content: c, onChange }: EditorProps<BlogFeedContent>) {
  const set = (patch: Partial<BlogFeedContent>) => onChange({ ...c, ...patch });
  return (
    <>
      <SectionBoxGroup value={c.section} onChange={(section) => set({ section })} />
      <Group title="Section header">
        <LegacyHeaderEditor value={c.header} onChange={(header) => set({ header })} />
      </Group>
      <Group title="Listing" open>
        <PostsHint />
        <div className="admin-form-grid">
          <ColumnsEditor value={c.columns} onChange={(columns) => set({ columns })} defaults={{ desktop: 3, tablet: 2, mobile: 1 }} />
          <TextInput label="Gap" value={c.gap} onChange={(gap) => set({ gap })} placeholder="1.25rem" />
          <NumberInput label="Cards per page" value={c.pageSize} min={3} max={48} placeholder="9" onChange={(pageSize) => set({ pageSize: pageSize || 9 })} />
          <TextInput label="'Load more' label" value={c.loadMoreLabel} onChange={(loadMoreLabel) => set({ loadMoreLabel })} placeholder="Load more articles" />
          <Field label="Behaviour">
            <Toggle label="Skip posts already shown as Featured" checked={c.excludeFeatured !== false} onChange={(excludeFeatured) => set({ excludeFeatured })} />
            <Toggle label="Search box" checked={c.showSearch !== false} onChange={(showSearch) => set({ showSearch })} />
          </Field>
          <TextInput label="Search placeholder" value={c.searchPlaceholder} onChange={(searchPlaceholder) => set({ searchPlaceholder })} placeholder="Search articles…" />
        </div>
      </Group>
      <Group title="Empty state" description="Shown when a topic or search has no matches">
        <div className="admin-form-grid">
          <TextInput label="Title" value={c.emptyTitle} onChange={(emptyTitle) => set({ emptyTitle })} placeholder="No articles found" />
          <TextInput label="Text" value={c.emptyBody} onChange={(emptyBody) => set({ emptyBody })} placeholder="Try another topic or search term." />
        </div>
      </Group>
      <CardOptionsGroup value={c} onChange={set} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* CTA band                                                            */
/* ------------------------------------------------------------------ */

function BlogCtaEditor({ content: c, onChange }: EditorProps<BlogCtaContent>) {
  const set = (patch: Partial<BlogCtaContent>) => onChange({ ...c, ...patch });
  return (
    <>
      <SectionBoxGroup value={c.section} onChange={(section) => set({ section })} />
      <BgMediaGroup value={c.background} onChange={(background) => set({ background })} title="Background images / videos" />
      <Group title="Layout">
        <div className="admin-form-grid">
          <AlignButtons label="Content align" value={c.align} options={['left', 'center']} onChange={(align) => set({ align: (align || 'center') as BlogCtaContent['align'] })} />
          <TextInput label="Content max width" value={c.maxWidth} onChange={(maxWidth) => set({ maxWidth })} placeholder="760px" />
        </div>
      </Group>
      <Group title="Eyebrow">
        <TextElementEditor label="Eyebrow" eyebrow siteScale="base" value={c.eyebrow} onChange={(eyebrow) => set({ eyebrow })} hint="Optional; empty = hidden" />
      </Group>
      <Group title="Heading" open>
        <TextElementEditor label="Heading" multiline headingTag siteRole="section" value={c.title} onChange={(title) => set({ title })} />
        <HighlightEditor value={c.highlight} onChange={(highlight) => set({ highlight })} />
      </Group>
      <Group title="Body text">
        <TextElementEditor label="Body" multiline value={c.body} onChange={(body) => set({ body })} />
      </Group>
      <Group title="Buttons" open>
        <NapHint />
        <CtaListEditor value={c.ctas} onChange={(ctas) => set({ ctas })} />
      </Group>
    </>
  );
}

/* ------------------------------------------------------------------ */

export default function BlogSectionEditor({
  type,
  content,
  onChange,
}: {
  type: BlogSectionType;
  content: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}) {
  const emit = (next: object) => onChange(next as Record<string, unknown>);
  const [site, setSite] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/admin/site-settings')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.settings) setSite(mergeSiteSettings(data.settings));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AboutSiteSettingsContext.Provider value={site}>
      <div className="az-admin lz-admin lgy-admin blg-admin">
        <ThemeColorDatalist />
        <LifeGroupProvider key={type}>
          {type === 'blog_hero' ? (
            <BlogHeroEditor content={withBlogDefaults<BlogHeroContent>(type, content)} onChange={emit} />
          ) : type === 'blog_featured' ? (
            <BlogFeaturedEditor content={withBlogDefaults<BlogFeaturedContent>(type, content)} onChange={emit} />
          ) : type === 'blog_topics' ? (
            <BlogTopicsEditor content={withBlogDefaults<BlogTopicsContent>(type, content)} onChange={emit} />
          ) : type === 'blog_feed' ? (
            <BlogFeedEditor content={withBlogDefaults<BlogFeedContent>(type, content)} onChange={emit} />
          ) : type === 'blog_cta' ? (
            <BlogCtaEditor content={withBlogDefaults<BlogCtaContent>(type, content)} onChange={emit} />
          ) : null}
        </LifeGroupProvider>
      </div>
    </AboutSiteSettingsContext.Provider>
  );
}
