import { listTestimonials, testimonialsJsonLd, type SiteTestimonial } from '@/lib/testimonials';
import { getThemeSettings } from '@/lib/cms';
import { mergeSiteSettings } from '@/lib/site-settings';

export default async function TestimonialsStrip({ title = 'What clients say' }: { title?: string }) {
  let items: SiteTestimonial[] = [];
  try {
    items = await listTestimonials({ featuredOnly: true });
  } catch {
    items = [];
  }
  if (!items.length) return null;

  const theme = await getThemeSettings();
  const site = mergeSiteSettings(theme.site);
  const jsonLd = testimonialsJsonLd(items, site.companyName);

  return (
    <section className="section section-gray testimonials-strip" aria-label="Testimonials">
      {jsonLd ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      ) : null}
      <div className="container">
        <div className="section-head center">
          <div className="eyebrow eyebrow-orange">Reviews</div>
          <h2>{title}</h2>
        </div>
        <div className="testimonials-grid">
          {items.slice(0, 3).map((t) => (
            <blockquote key={t.id} className="testimonial-card">
              {t.rating ? <div className="testimonial-rating">{'★'.repeat(Math.min(5, t.rating))}</div> : null}
              <p>“{t.quote}”</p>
              <footer>
                <strong>{t.author_name}</strong>
                {t.author_role || t.company ? (
                  <span>
                    {[t.author_role, t.company].filter(Boolean).join(' · ')}
                  </span>
                ) : null}
              </footer>
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}
