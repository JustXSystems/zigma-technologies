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
  const hi = localeCityCopy('hi', slug);
  return buildPageMetadata({
    title: hi?.title || loc.name,
    description: hi?.lead || loc.lead,
    path: `/hi/locations/${slug}`,
    locale: LOCALE_OG.hi,
    noindex: !hi,
    ...(hi ? { languages: localeAlternates(cityLocalePaths(slug, copy.features.localesEnabled)) } : {}),
  });
}

export function generateStaticParams() {
  return LOCATION_DEFS.map((l) => ({ slug: l.key }));
}

export default async function HindiLocationPage({ params }: Props) {
  const { slug } = await params;
  const loc = getLocationByKey(slug);
  if (!loc) notFound();
  const copy = await getSiteCopy();
  if (!copy.features.localesEnabled) redirect(`/locations/${slug}`);
  const hi = localeCityCopy('hi', slug);
  return (
    <main id="main-content" lang="hi" className="container" style={{ padding: '8rem 0 4rem', maxWidth: 800 }}>
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link href="/hi">हिन्दी</Link>
        <span className="sep">/</span>
        <Link href="/locations">Locations</Link>
        <span className="sep">/</span>
        <span className="current">{loc.name}</span>
      </nav>
      <h1 className="heading-size-h3">{hi?.title || loc.name}</h1>
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
