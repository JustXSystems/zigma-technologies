import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getLocationByKey, LOCATION_DEFS } from '@/lib/locations';
import { LOCALE_OG, cityLocalePaths, localeCityCopy } from '@/lib/locale-locations';
import { buildPageMetadata, localeAlternates } from '@/lib/seo';
import { getSiteCopy } from '@/lib/site-content';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const loc = getLocationByKey(slug);
  if (!loc) notFound();
  const copy = await getSiteCopy();
  const kn = localeCityCopy('kn', slug);
  return buildPageMetadata({
    title: kn?.title || loc.name,
    description: kn?.lead || loc.lead,
    path: `/kn/locations/${slug}`,
    locale: LOCALE_OG.kn,
    noindex: !kn,
    ...(kn ? { languages: localeAlternates(cityLocalePaths(slug, copy.features.localesEnabled)) } : {}),
  });
}

export function generateStaticParams() {
  return LOCATION_DEFS.map((l) => ({ slug: l.key }));
}

export default async function KannadaLocationPage({ params }: Props) {
  const { slug } = await params;
  const loc = getLocationByKey(slug);
  if (!loc) notFound();
  const copy = await getSiteCopy();
  if (!copy.features.localesEnabled) redirect(`/locations/${slug}`);
  const kn = localeCityCopy('kn', slug);
  return (
    <main id="main-content" lang="kn" className="container" style={{ padding: '8rem 0 4rem', maxWidth: 800 }}>
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link href="/kn">ಕನ್ನಡ</Link>
        <span className="sep">/</span>
        <Link href="/locations">Locations</Link>
        <span className="sep">/</span>
        <span className="current">{loc.name}</span>
      </nav>
      <h1 className="heading-size-h3">{kn?.title || loc.name}</h1>
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
