import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import LocaleLanding from '@/components/i18n/LocaleLanding';
import { getSiteCopy } from '@/lib/site-content';

export async function generateMetadata(): Promise<Metadata> {
  const copy = await getSiteCopy();
  const locale = copy.locales.hi;
  return {
    title: locale.title,
    description: locale.lead,
    alternates: { languages: { en: '/', hi: '/hi', kn: '/kn' } },
  };
}

export default async function HindiHomePage() {
  const copy = await getSiteCopy();
  if (!copy.features.localesEnabled) redirect('/');
  return <LocaleLanding locale="hi" copy={copy.locales.hi} toolsEnabled={copy.features.toolsEnabled} />;
}
