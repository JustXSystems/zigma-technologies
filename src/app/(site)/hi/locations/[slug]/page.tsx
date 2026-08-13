import type { Metadata } from 'next';
import Link from 'next/link';
import { getLocationByKey, LOCATION_DEFS } from '@/lib/locations';
import { notFound } from 'next/navigation';

type Props = { params: Promise<{ slug: string }> };

const HI: Record<string, { title: string; lead: string }> = {
  bengaluru: {
    title: 'बेंगलुरु में पावर और एनर्जी इंजीनियरिंग',
    lead: 'बेंगलुरु उद्योगों, कैंपस और अस्पतालों के लिए सोलर EPC, UPS, BESS और 24×7 AMC।',
  },
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const loc = getLocationByKey(slug);
  const hi = HI[slug];
  if (!loc) return { title: 'स्थान नहीं मिला' };
  return {
    title: hi?.title || `${loc.name} | ज़िग्मा`,
    description: hi?.lead || loc.lead,
    alternates: { languages: { en: `/locations/${slug}`, hi: `/hi/locations/${slug}`, kn: `/kn/locations/${slug}` } },
  };
}

export function generateStaticParams() {
  return LOCATION_DEFS.map((l) => ({ slug: l.key }));
}

export default async function HindiLocationPage({ params }: Props) {
  const { slug } = await params;
  const loc = getLocationByKey(slug);
  if (!loc) notFound();
  const hi = HI[slug];
  return (
    <main id="main-content" className="container" style={{ padding: '8rem 0 4rem', maxWidth: 800 }}>
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link href="/hi">हिन्दी</Link>
        <span className="sep">/</span>
        <Link href="/locations">Locations</Link>
        <span className="sep">/</span>
        <span className="current">{loc.name}</span>
      </nav>
      <h1>{hi?.title || loc.name}</h1>
      <p className="lead">{hi?.lead || loc.lead}</p>
      <p>
        <Link href={`/locations/${slug}`} className="btn btn-ghost-dark">
          English city page
        </Link>{' '}
        <Link href={`/contact?consult=1&consult_subject=${encodeURIComponent(loc.subject)}`} className="btn btn-primary">
          परामर्श →
        </Link>
      </p>
    </main>
  );
}
