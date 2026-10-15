'use client';

import { useCallback, useEffect, useState } from 'react';
import AdminCollapsible from '@/components/admin/AdminCollapsible';
import AdminFloatingActions from '@/components/admin/AdminFloatingActions';
import MediaPicker from '@/components/admin/MediaPicker';
import { useAdminUser } from '@/components/admin/admin-session';
import { SelectInput, TextArea, TextInput, ToggleCard } from '@/components/admin/form/controls';
import { NumberInput } from '@/components/admin/section-kit';
import { useDirtyTracker } from '@/components/admin/unsaved-changes';
import { hasScreenAccess } from '@/lib/admin-screens';
import { appHref } from '@/lib/base-path';
import {
  ACCENT_SWATCHES,
  ARTICLE_STYLE_OPTIONS,
  BLOG_ARTICLE_TEMPLATES,
  BLOG_HUB_TEMPLATES,
  DEFAULT_BLOG_SETTINGS,
  articleStyleAttrs,
  type BlogArticleStyle,
  type BlogSettings,
} from '@/lib/blog-design';
import { ArticleThumb, HubThumb } from './BlogTemplateThumb';

const ARTICLE_PARTS: ReadonlyArray<{ key: Exclude<keyof BlogSettings['article'], 'related'>; label: string; hint: string }> = [
  { key: 'progressBar', label: 'Reading progress bar', hint: 'Thin bar at the top that fills as the reader scrolls' },
  { key: 'toc', label: 'Contents with live progress', hint: 'Built from the H2 / H3 headings; highlights the section being read' },
  { key: 'keyPoints', label: 'Key takeaways card', hint: 'Summary bullets above the body, written per article' },
  { key: 'author', label: 'Author byline and card', hint: 'Avatar, name and role; falls back to the default author' },
  { key: 'share', label: 'Share buttons', hint: 'LinkedIn, X, WhatsApp, email and copy link' },
  { key: 'prevNext', label: 'Previous / next article', hint: 'Two links at the end of every article' },
  { key: 'sideCta', label: 'Side CTA card', hint: 'Technical brief layout only: sits under the contents rail' },
  { key: 'ctaBand', label: 'CTA band at the end', hint: 'Full-width band with the call to action below' },
];

/** Blog-wide design: hub and article templates, article parts, labels, default author and CTA (theme_settings.blog). */
export default function BlogDesign() {
  const user = useAdminUser();
  const canApply = user ? hasScreenAccess(user.screens, 'pages') : false;
  const [settings, setSettings] = useState<BlogSettings>(DEFAULT_BLOG_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const { markClean } = useDirtyTracker(settings);

  const applySaved = useCallback(
    (next: BlogSettings) => {
      setSettings(next);
      setLoaded(true);
      markClean();
    },
    [markClean]
  );

  useEffect(() => {
    fetch('/api/admin/blog-settings')
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || 'Failed to load');
        applySaved(data.settings);
      })
      .catch((e: Error) => {
        setError(e.message);
        setLoaded(true);
      });
  }, [applySaved]);

  const set = <K extends keyof BlogSettings>(key: K, patch: Partial<BlogSettings[K]>) =>
    setSettings((s) => ({ ...s, [key]: { ...(s[key] as object), ...patch } }));

  async function save() {
    const res = await fetch('/api/admin/blog-settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Save failed');
    applySaved(data.settings);
  }

  async function run(key: string, task: () => Promise<string>) {
    setBusy(key);
    setError('');
    setMessage('');
    try {
      setMessage(await task());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy('');
    }
  }

  const hub = BLOG_HUB_TEMPLATES.find((t) => t.id === settings.hubTemplate) ?? BLOG_HUB_TEMPLATES[0];

  const applyColours = () => {
    if (
      !window.confirm(
        `Save, then recolour every /blog section for the ${hub.label} design?\n\nBackgrounds, tone, pattern, eyebrow colours and button styles change; text, images and spacing are kept. Sections set to their own design switch back to following the blog design.`
      )
    )
      return;
    void run('apply', async () => {
      await save();
      const res = await fetch('/api/admin/blog-settings/apply-hub', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template: settings.hubTemplate }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not apply the colours');
      return `Saved. ${data.updated} /blog section${data.updated === 1 ? '' : 's'} now use the ${hub.label} colours.`;
    });
  };

  if (!loaded) return <div className="admin-card">Loading blog design…</div>;
  const a = settings.article;
  const st = settings.style;
  const sample = articleStyleAttrs(st);

  return (
    <>
      <AdminFloatingActions status={message || (busy ? 'Saving…' : undefined)}>
        <a className="admin-btn admin-btn-secondary" href={appHref('/blog')} target="_blank" rel="noreferrer">
          View /blog ↗
        </a>
        <button
          type="button"
          className="admin-btn admin-btn-primary"
          disabled={Boolean(busy)}
          onClick={() =>
            void run('save', async () => {
              await save();
              return 'Blog design saved. The site picks it up on the next page load.';
            })
          }
        >
          {busy === 'save' ? 'Saving…' : 'Save design'}
        </button>
      </AdminFloatingActions>

      {error ? <div className="admin-error">{error}</div> : null}
      {message ? <div className="admin-success">{message}</div> : null}

      <section className="admin-card abl-design-block">
        <header className="abl-design-head">
          <div>
            <h3>Blog page design</h3>
            <p>The look of /blog. Every page section follows it unless that section picks its own design.</p>
          </div>
        </header>
        <div className="abl-tpl-grid" role="radiogroup" aria-label="Blog page design">
          {BLOG_HUB_TEMPLATES.map((t) => (
            <label key={t.id} className={`abl-tpl-card${settings.hubTemplate === t.id ? ' is-on' : ''}`}>
              <input type="radio" name="blog-hub-template" checked={settings.hubTemplate === t.id} onChange={() => setSettings((s) => ({ ...s, hubTemplate: t.id }))} />
              <HubThumb template={t.id} />
              <strong>{t.label}</strong>
              <span>{t.summary}</span>
              <small>Best for: {t.bestFor}</small>
            </label>
          ))}
        </div>
        <div className="abl-apply">
          <div>
            <strong>Match the colours</strong>
            <p>
              Each design is drawn for its own palette — Editorial on warm paper, Bento in deep navy, Signal on a light blueprint grid. Apply it to
              recolour the /blog sections in one step.
            </p>
          </div>
          {canApply ? (
            <button type="button" className="admin-btn admin-btn-secondary" disabled={Boolean(busy)} onClick={applyColours}>
              {busy === 'apply' ? 'Applying…' : `Save & apply ${hub.label} colours`}
            </button>
          ) : (
            <p className="admin-hint">Needs access to Pages.</p>
          )}
        </div>
      </section>

      <section className="admin-card abl-design-block">
        <header className="abl-design-head">
          <div>
            <h3>Article layout</h3>
            <p>How each post at /blog/&lt;slug&gt; reads. A post can pick a different layout in its own editor.</p>
          </div>
        </header>
        <div className="abl-tpl-grid abl-tpl-grid--3" role="radiogroup" aria-label="Article layout">
          {BLOG_ARTICLE_TEMPLATES.map((t) => (
            <label key={t.id} className={`abl-tpl-card${settings.articleTemplate === t.id ? ' is-on' : ''}`}>
              <input
                type="radio"
                name="blog-article-template"
                checked={settings.articleTemplate === t.id}
                onChange={() => setSettings((s) => ({ ...s, articleTemplate: t.id }))}
              />
              <ArticleThumb template={t.id} />
              <strong>{t.label}</strong>
              <span>{t.summary}</span>
              <small>Best for: {t.bestFor}</small>
            </label>
          ))}
        </div>
      </section>

      <section className="admin-card abl-design-block">
        <header className="abl-design-head">
          <div>
            <h3>Article style</h3>
            <p>Colour and typography of every article body. A post can change its accent and width under “This article&rsquo;s look”.</p>
          </div>
        </header>
        <div className="abl-style-grid">
          <div className="abl-style-controls">
            <div className="admin-field">
              <span className="abl-mini-label">Accent colour (links, numbers, contents, boxes)</span>
              <div className="abl-swatches">
                <button type="button" className={`abl-swatch is-default${!st.accent ? ' is-on' : ''}`} onClick={() => set('style', { accent: '' })} title="Brand blue">
                  Brand
                </button>
                {ACCENT_SWATCHES.map((c) => (
                  <button key={c} type="button" className={`abl-swatch${st.accent === c ? ' is-on' : ''}`} style={{ background: c }} onClick={() => set('style', { accent: c })} aria-label={`Accent ${c}`} />
                ))}
                <input type="color" aria-label="Custom accent" value={st.accent || '#0284A8'} onChange={(e) => set('style', { accent: e.target.value })} />
              </div>
            </div>
            <SelectInput label="Text width" value={st.width} options={ARTICLE_STYLE_OPTIONS.width} onChange={(width) => set('style', { width: width as BlogArticleStyle['width'] })} />
            <SelectInput label="Text size" value={st.textSize} options={ARTICLE_STYLE_OPTIONS.textSize} onChange={(textSize) => set('style', { textSize: textSize as BlogArticleStyle['textSize'] })} />
            <SelectInput
              label="Heading font"
              value={st.headingFont}
              options={ARTICLE_STYLE_OPTIONS.headingFont}
              onChange={(headingFont) => set('style', { headingFont: headingFont as BlogArticleStyle['headingFont'] })}
            />
            <SelectInput label="Drop cap (big first letter)" value={st.dropCap} options={ARTICLE_STYLE_OPTIONS.dropCap} onChange={(dropCap) => set('style', { dropCap: dropCap as BlogArticleStyle['dropCap'] })} />
          </div>
          <div className={`abl-style-sample blg-article blg-article--${settings.articleTemplate} ${sample.className}`} style={sample.style} aria-label="Sample article text">
            <div className="blg-prose">
              <p>
                Correct UPS sizing protects critical loads without overspending. Start with the <a href="#sample">measured load</a>, convert it to kVA, then add
                headroom for growth.
              </p>
              <h2>Sizing in three steps</h2>
              <ol className="blg-steps">
                <li>
                  <p>
                    <strong>Measure</strong> the real load in kW.
                  </p>
                </li>
                <li>
                  <p>
                    <strong>Convert</strong> with the power factor.
                  </p>
                </li>
              </ol>
              <div className="blg-callout" data-tone="tip">
                <p>
                  <strong>Tip:</strong> plan 20–25% headroom for inrush.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="admin-page-stack">
        <AdminCollapsible title="What every article shows" description="Reader tools and end-of-article blocks" defaultOpen>
          <div className="admin-footer-office-toggles">
            {ARTICLE_PARTS.map((p) => (
              <ToggleCard key={p.key} id={`blog-part-${p.key}`} label={p.label} hint={p.hint} checked={a[p.key]} onChange={(on) => set('article', { [p.key]: on })} />
            ))}
          </div>
          <div className="admin-form-grid" style={{ marginTop: '0.85rem' }}>
            <NumberInput
              label="Related articles at the end"
              value={a.related}
              min={0}
              max={6}
              placeholder="3"
              hint="0 hides them. Picked by shared tags, then the newest posts."
              onChange={(related) => set('article', { related: related ?? 0 })}
            />
          </div>
        </AdminCollapsible>

        <AdminCollapsible title="Labels" description="Headings of the article blocks">
          <div className="admin-form-grid">
            <TextInput label="Key takeaways heading" value={settings.labels.keyPoints} onChange={(keyPoints) => set('labels', { keyPoints })} placeholder="Key takeaways" />
            <TextInput label="Contents heading" value={settings.labels.toc} onChange={(toc) => set('labels', { toc })} placeholder="On this page" />
            <TextInput label="Related heading" value={settings.labels.related} onChange={(related) => set('labels', { related })} placeholder="Keep reading" />
            <TextInput label="Related lead" value={settings.labels.relatedLead} onChange={(relatedLead) => set('labels', { relatedLead })} />
          </div>
        </AdminCollapsible>

        <AdminCollapsible title="Default author" description="Byline for posts without their own author">
          <div className="admin-form-grid">
            <TextInput label="Name" value={settings.author.name} onChange={(name) => set('author', { name })} placeholder="Zigma engineering team" />
            <TextInput label="Role" value={settings.author.role} onChange={(role) => set('author', { role })} />
            <div className="full">
              <MediaPicker label="Avatar (square)" value={settings.author.avatar} onChange={(avatar) => set('author', { avatar })} kinds={['image', 'svg']} allowUpload hint="Empty = initials" />
            </div>
            <TextArea label="Short bio (author card)" value={settings.author.bio} onChange={(bio) => set('author', { bio })} rows={3} />
          </div>
        </AdminCollapsible>

        <AdminCollapsible title="Call to action" description="Side card and end-of-article band">
          <div className="admin-form-grid">
            <TextInput label="Eyebrow" value={settings.cta.eyebrow} onChange={(eyebrow) => set('cta', { eyebrow })} />
            <TextInput label="Title" value={settings.cta.title} onChange={(title) => set('cta', { title })} />
            <TextArea label="Text" value={settings.cta.body} onChange={(body) => set('cta', { body })} rows={2} />
            <TextInput label="Primary button" value={settings.cta.primaryLabel} onChange={(primaryLabel) => set('cta', { primaryLabel })} />
            <TextInput label="Primary link" value={settings.cta.primaryHref} onChange={(primaryHref) => set('cta', { primaryHref })} placeholder="/contact?consult=1" />
            <TextInput label="Secondary button" value={settings.cta.secondaryLabel} onChange={(secondaryLabel) => set('cta', { secondaryLabel })} hint="Empty = hidden" />
            <TextInput label="Secondary link" value={settings.cta.secondaryHref} onChange={(secondaryHref) => set('cta', { secondaryHref })} placeholder="/blog" />
          </div>
        </AdminCollapsible>
      </div>
    </>
  );
}
