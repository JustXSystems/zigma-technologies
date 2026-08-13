import Link from 'next/link';
import { getSiteCopy } from '@/lib/site-content';

const DEFAULT_LOGOS = [
  { src: '/assets/images/abb.png', alt: 'ABB' },
  { src: '/assets/images/schneider-electric.png', alt: 'Schneider Electric' },
  { src: '/assets/images/eaton.png', alt: 'Eaton' },
  { src: '/assets/images/vertiv.png', alt: 'Vertiv' },
  { src: '/assets/images/hitachi.png', alt: 'Hitachi' },
  { src: '/assets/images/kirloskar-solar.png', alt: 'Kirloskar Solar' },
];

type Props = {
  title?: string;
  showCertLink?: boolean;
};

export default async function SocialProofStrip({ title, showCertLink = true }: Props) {
  const copy = await getSiteCopy();
  const heading = title || copy.socialProof.title;

  return (
    <section className="social-proof-strip" aria-label="Trusted partners">
      <div className="container">
        <div className="social-proof-inner">
          <div className="social-proof-head">
            <div className="social-proof-copy">
              <div className="eyebrow eyebrow-cyan">TRUSTED PARTNERS</div>
              <h2 className="social-proof-title">{heading}</h2>
              {copy.socialProof.subtitle ? (
                <p className="social-proof-subtitle">{copy.socialProof.subtitle}</p>
              ) : null}
            </div>
            {showCertLink ? (
              <Link href="/certifications" className="btn-certs social-proof-cert-link">
                {copy.a11y.viewCertifications} →
              </Link>
            ) : null}
          </div>
          <div className="social-proof-logos">
            {DEFAULT_LOGOS.map((logo) => (
              <div key={logo.src} className="social-proof-logo-card">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logo.src} alt={logo.alt} loading="lazy" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
