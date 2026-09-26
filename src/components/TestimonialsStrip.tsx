import { listTestimonials, type SiteTestimonial } from '@/lib/testimonials';
import SiteHeading from '@/components/SiteHeading';

export default async function TestimonialsStrip({ title = 'What clients say' }: { title?: string }) {
  let items: SiteTestimonial[] = [];
  try {
    items = await listTestimonials({ featuredOnly: true });
  } catch {
    items = [];
  }
  if (!items.length) return null;

  // No Review / AggregateRating markup: Google treats testimonials a business publishes
  // about itself as self-serving and ineligible for review rich results.
  return (
    <section className="section section-gray testimonials-strip" aria-label="Testimonials">
      <div className="container">
        <div className="section-head center">
          <div className="eyebrow eyebrow-orange">Reviews</div>
          <SiteHeading role="section">{title}</SiteHeading>
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
