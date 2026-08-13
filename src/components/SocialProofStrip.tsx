import Link from 'next/link';

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

export default function SocialProofStrip({
  title = 'Trusted by industry leaders across India',
  showCertLink = true,
}: Props) {
  return (
    <section className="social-proof-strip" aria-label="Trusted partners">
      <div className="container">
        <div className="social-proof-head">
          <p>{title}</p>
          {showCertLink ? (
            <Link href="/certifications" className="link">
              View certifications →
            </Link>
          ) : null}
        </div>
        <div className="social-proof-logos">
          {DEFAULT_LOGOS.map((logo) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={logo.src} src={logo.src} alt={logo.alt} loading="lazy" />
          ))}
        </div>
      </div>
    </section>
  );
}
