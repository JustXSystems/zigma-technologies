import Link from 'next/link';
import type { CatalogItem, CatalogItemType } from '@/lib/types';
import CatalogMediaGallery from '@/components/CatalogMediaGallery';
import CatalogCaseStudyEnquiry from '@/components/catalog/CatalogCaseStudyEnquiry';
import BrochureDownloadGate from '@/components/BrochureDownloadGate';
import {
  CATALOG_TYPE_LABEL,
  catalogListingPath,
  catalogPublicPath,
  caseStudyLabel,
  hasCaseStudyContent,
  pickHighlightMetric,
} from '@/lib/catalog-case-study';
import { getBrochureUrl } from '@/lib/catalog-brochure';
import { catalogWhatsAppMessage, whatsappHref } from '@/lib/whatsapp';
import { DEFAULT_SITE_SETTINGS } from '@/lib/site-settings';

type Props = {
  item: CatalogItem;
  itemType: CatalogItemType;
  related?: CatalogItem[];
  whatsapp?: string;
};

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="case-study-metric">
      <span className="case-study-metric-label">{label}</span>
      <span className="case-study-metric-value">{value}</span>
    </div>
  );
}

function pickCapacity(specs: Record<string, string> | null | undefined) {
  if (!specs) return null;
  const keys = Object.keys(specs);
  const hit = keys.find((k) => /capacity|kva|kw|power/i.test(k));
  return hit ? { label: hit, value: specs[hit] } : null;
}

export default function CatalogCaseStudyView({
  item,
  itemType,
  related = [],
  whatsapp = DEFAULT_SITE_SETTINGS.whatsapp,
}: Props) {
  const cs = item.case_study_json;
  const showCaseStudy = hasCaseStudyContent(item);
  const highlight = pickHighlightMetric(item.specs_json);
  const capacity = pickCapacity(item.specs_json);
  const specEntries = Object.entries(item.specs_json || {}).filter(([k]) => k.toLowerCase() !== 'highlight');
  const heroImage =
    item.primary_image || item.media?.[0]?.url || '/assets/images/engineers-reviewing-electrical-design-dr.jpg';
  const brochureUrl = getBrochureUrl(item);
  const waMessage = catalogWhatsAppMessage({
    title: item.title,
    itemType: CATALOG_TYPE_LABEL[itemType],
    capacity: capacity?.value,
    location: cs?.location,
  });
  const brandTags = (item.tags_json || []).filter((t) => t.length <= 24);

  return (
    <main id="main-content" className="case-study-page">
      <section className="case-study-hero">
        <div className="hero-bg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={heroImage} alt="" />
          <div className="hero-overlay"></div>
          <div className="grid-overlay"></div>
        </div>
        <div className="container case-study-hero-inner">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span className="sep">/</span>
            <Link href={catalogListingPath(itemType)}>{CATALOG_TYPE_LABEL[itemType]}s</Link>
            <span className="sep">/</span>
            <span className="current">{item.title}</span>
          </nav>
          <div className="case-study-hero-grid">
            <div>
              <div className="eyebrow eyebrow-orange">{caseStudyLabel(itemType)}</div>
              <h1>{item.title}</h1>
              <p className="lead">{item.summary || item.description}</p>
              <div className="case-study-hero-meta">
                {cs?.client_sector ? <span>{cs.client_sector}</span> : null}
                {cs?.location ? <span>{cs.location}</span> : null}
                {cs?.delivery_year ? <span>{cs.delivery_year}</span> : null}
                {item.category_name ? <span>{item.category_name}</span> : null}
                {capacity ? (
                  <span>
                    {capacity.label}: {capacity.value}
                  </span>
                ) : null}
              </div>
              {brandTags.length ? (
                <div className="case-study-tags" style={{ marginTop: '0.85rem' }}>
                  {brandTags.map((tag) => (
                    <Link
                      key={tag}
                      href={`${catalogListingPath(itemType)}?tag=${encodeURIComponent(tag)}`}
                      className="case-study-tag"
                    >
                      {tag}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
            <aside className="case-study-hero-aside">
              {highlight ? <div className="case-study-hero-highlight">{highlight}</div> : null}
              {item.price_label ? <div className="case-study-hero-price">{item.price_label}</div> : null}
              {item.availability_label || item.lead_time_label ? (
                <p className="case-study-availability">
                  {item.availability_label ? <span>{item.availability_label}</span> : null}
                  {item.availability_label && item.lead_time_label ? ' · ' : null}
                  {item.lead_time_label ? <span>Lead time: {item.lead_time_label}</span> : null}
                </p>
              ) : null}
              {cs?.client_name ? (
                <p className="case-study-client">
                  <strong>Client</strong>
                  <span>{cs.client_name}</span>
                </p>
              ) : null}
              <div className="case-study-hero-actions">
                <a href="#enquire" className="btn btn-primary">
                  Request consultation
                </a>
                <a
                  href={whatsappHref(whatsapp, waMessage)}
                  className="btn btn-ghost-dark"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  WhatsApp quote
                </a>
              </div>
              {brochureUrl ? (
                <div style={{ marginTop: '0.85rem' }}>
                  <BrochureDownloadGate
                    brochureUrl={brochureUrl}
                    itemTitle={item.title}
                    itemId={item.id}
                    itemType={itemType}
                  />
                </div>
              ) : null}
            </aside>
          </div>
        </div>
      </section>

      {(highlight || capacity || specEntries.length > 0) && (
        <section className="case-study-metrics-band">
          <div className="container case-study-metrics-grid">
            {highlight ? <MetricCard label="Key outcome" value={highlight} /> : null}
            {capacity ? <MetricCard label={capacity.label} value={capacity.value} /> : null}
            {cs?.location ? <MetricCard label="Location" value={cs.location} /> : null}
            {specEntries
              .filter(([k]) => k !== capacity?.label)
              .slice(0, highlight ? 2 : 3)
              .map(([label, value]) => (
                <MetricCard key={label} label={label} value={value} />
              ))}
          </div>
        </section>
      )}

      <section className="section section-light">
        <div className="container case-study-content-grid">
          <div>
            <h2 className="case-study-section-title">Overview</h2>
            <p className="case-study-lead">{item.description || item.summary}</p>

            {showCaseStudy ? (
              <div className="case-study-split">
                {cs?.challenge ? (
                  <article className="case-study-panel">
                    <h3>Challenge</h3>
                    <p>{cs.challenge}</p>
                  </article>
                ) : null}
                {cs?.solution ? (
                  <article className="case-study-panel">
                    <h3>Solution</h3>
                    <p>{cs.solution}</p>
                  </article>
                ) : null}
              </div>
            ) : null}

            {cs?.scope ? (
              <article className="case-study-panel case-study-panel--full">
                <h3>Scope delivered</h3>
                <p>{cs.scope}</p>
              </article>
            ) : null}

            {cs?.outcomes?.length ? (
              <article className="case-study-panel case-study-panel--full">
                <h3>Outcomes</h3>
                <ul className="case-study-outcomes">
                  {cs.outcomes.map((outcome) => (
                    <li key={outcome}>{outcome}</li>
                  ))}
                </ul>
              </article>
            ) : null}

            {cs?.before_image_url || cs?.after_image_url ? (
              <article className="case-study-panel case-study-panel--full">
                <h3>Before / after</h3>
                <div className="case-study-before-after">
                  {cs.before_image_url ? (
                    <figure>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={cs.before_image_url} alt="Before" loading="lazy" />
                      <figcaption>Before</figcaption>
                    </figure>
                  ) : null}
                  {cs.after_image_url ? (
                    <figure>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={cs.after_image_url} alt="After" loading="lazy" />
                      <figcaption>After</figcaption>
                    </figure>
                  ) : null}
                </div>
              </article>
            ) : null}

            {cs?.video_url ? (
              <article className="case-study-panel case-study-panel--full">
                <h3>{cs.video_title || 'Project video'}</h3>
                <div className="case-study-video">
                  {/\.(mp4|webm)(\?|$)/i.test(cs.video_url) ? (
                    <video controls playsInline preload="metadata" src={cs.video_url}>
                      <track kind="captions" />
                    </video>
                  ) : (
                    <iframe
                      title={cs.video_title || item.title}
                      src={cs.video_url}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      loading="lazy"
                    />
                  )}
                </div>
                <script
                  type="application/ld+json"
                  dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                      '@context': 'https://schema.org',
                      '@type': 'VideoObject',
                      name: cs.video_title || item.title,
                      description: item.summary || item.title,
                      contentUrl: cs.video_url,
                      embedUrl: cs.video_url,
                      thumbnailUrl: heroImage,
                      uploadDate: item.updated_at || item.created_at,
                    }),
                  }}
                />
              </article>
            ) : null}

            {cs?.oem_badges?.length ? (
              <div className="case-study-oem">
                <h3>OEM / brands</h3>
                <div className="case-study-tags">
                  {cs.oem_badges.map((badge) => (
                    <span key={badge} className="case-study-tag">
                      {badge}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {cs?.case_study_pdf_url ? (
              <p style={{ marginTop: '1rem' }}>
                <a className="btn btn-ghost-dark" href={cs.case_study_pdf_url} target="_blank" rel="noopener noreferrer">
                  Download case study PDF →
                </a>
              </p>
            ) : null}

            {cs?.technologies?.length || item.tags_json?.length ? (
              <div className="case-study-tags">
                {(cs?.technologies || item.tags_json || []).map((tag) => (
                  <Link
                    key={tag}
                    href={`${catalogListingPath(itemType)}?tag=${encodeURIComponent(tag)}`}
                    className="case-study-tag"
                  >
                    {tag}
                  </Link>
                ))}
              </div>
            ) : null}

            {cs?.testimonial?.quote ? (
              <blockquote className="case-study-quote">
                <p>“{cs.testimonial.quote}”</p>
                {cs.testimonial.author ? (
                  <footer>
                    {cs.testimonial.author}
                    {cs.testimonial.role ? ` · ${cs.testimonial.role}` : ''}
                  </footer>
                ) : null}
              </blockquote>
            ) : null}
          </div>

          <aside className="case-study-sidebar">
            {item.media?.length ? (
              <div className="case-study-sidebar-block">
                <h3>Gallery</h3>
                <CatalogMediaGallery media={item.media} title={item.title} variant="detail" />
              </div>
            ) : null}

            {specEntries.length ? (
              <div className="case-study-sidebar-block">
                <h3>Specifications</h3>
                <dl className="case-study-specs">
                  {specEntries.map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : null}
          </aside>
        </div>
      </section>

      {related.length ? (
        <section className="section case-study-related">
          <div className="container">
            <div className="section-head">
              <div className="eyebrow eyebrow-cyan">Related work</div>
              <h2>More {CATALOG_TYPE_LABEL[itemType].toLowerCase()}s</h2>
            </div>
            <div className="proj-grid">
              {related.map((rel) => (
                <Link key={rel.id} href={catalogPublicPath(itemType, rel.slug)} className="proj-card">
                  <div className="proj-media">
                    {rel.primary_image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={rel.primary_image} alt={rel.title} loading="lazy" />
                    ) : null}
                    <span className="tag">{rel.category_name || rel.item_type}</span>
                  </div>
                  <div className="proj-body">
                    <h5>{rel.title}</h5>
                    <p>{rel.summary}</p>
                    <span className="link">View details →</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <CatalogCaseStudyEnquiry item={item} itemType={itemType} />
    </main>
  );
}
