import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import LocaleLanding from '@/components/i18n/LocaleLanding';
import { LOCALE_OG } from '@/lib/locale-locations';
import { buildPageMetadata, localeAlternates } from '@/lib/seo';
import { getSiteCopy } from '@/lib/site-content';

export async function generateMetadata(): Promise<Metadata> {
  const copy = await getSiteCopy();
  const locale = copy.locales.hi;
  return buildPageMetadata({
    title: locale.title,
    description: locale.lead,
    path: '/hi',
    locale: LOCALE_OG.hi,
    languages: localeAlternates({ en: '/', hi: '/hi', kn: '/kn' }),
  });
}

export default async function HindiHomePage() {
  const copy = await getSiteCopy();
  if (!copy.features.localesEnabled) redirect('/');
  return <LocaleLanding locale="hi" copy={copy.locales.hi} toolsEnabled={copy.features.toolsEnabled} />;
}
