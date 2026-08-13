import type { Metadata } from 'next';
import Link from 'next/link';
import { getLocationByKey, LOCATION_DEFS } from '@/lib/locations';
import { notFound } from 'next/navigation';

type Props = { params: Promise<{ slug: string }> };

const KN: Record<string, { title: string; lead: string }> = {
  bengaluru: {
    title: 'ಬೆಂಗಳೂರಿನಲ್ಲಿ ಪವರ್ ಮತ್ತು ಎನರ್ಜಿ ಎಂಜಿನಿಯರಿಂಗ್',
    lead: 'ಬೆಂಗಳೂರು ಕೈಗಾರಿಕೆ, ಕ್ಯಾಂಪಸ್ ಮತ್ತು ಆಸ್ಪತ್ರೆಗಳಿಗೆ ಸೋಲಾರ್ EPC, UPS, BESS ಮತ್ತು 24×7 AMC.',
  },
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const loc = getLocationByKey(slug);
  const kn = KN[slug];
  if (!loc) return { title: 'ಸ್ಥಳ ಸಿಗಲಿಲ್ಲ' };
  return {
    title: kn?.title || `${loc.name} | ಝಿಗ್ಮಾ`,
    description: kn?.lead || loc.lead,
    alternates: { languages: { en: `/locations/${slug}`, hi: `/hi/locations/${slug}`, kn: `/kn/locations/${slug}` } },
  };
}

export function generateStaticParams() {
  return LOCATION_DEFS.map((l) => ({ slug: l.key }));
}

export default async function KannadaLocationPage({ params }: Props) {
  const { slug } = await params;
  const loc = getLocationByKey(slug);
  if (!loc) notFound();
  const kn = KN[slug];
  return (
    <main id="main-content" className="container" style={{ padding: '8rem 0 4rem', maxWidth: 800 }}>
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link href="/kn">ಕನ್ನಡ</Link>
        <span className="sep">/</span>
        <Link href="/locations">Locations</Link>
        <span className="sep">/</span>
        <span className="current">{loc.name}</span>
      </nav>
      <h1>{kn?.title || loc.name}</h1>
      <p className="lead">{kn?.lead || loc.lead}</p>
      <p>
        <Link href={`/locations/${slug}`} className="btn btn-ghost-dark">
          English city page
        </Link>{' '}
        <Link href={`/contact?consult=1&consult_subject=${encodeURIComponent(loc.subject)}`} className="btn btn-primary">
          ಸಮಾಲೋಚನೆ →
        </Link>
      </p>
    </main>
  );
}
