import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import LocaleLanding from '@/components/i18n/LocaleLanding';
import { getSiteCopy } from '@/lib/site-content';

export async function generateMetadata(): Promise<Metadata> {
  const copy = await getSiteCopy();
  const locale = copy.locales.kn;
  return {
    title: locale.title,
    description: locale.lead,
    alternates: { languages: { en: '/', hi: '/hi', kn: '/kn' } },
  };
}

export default async function KannadaHomePage() {
  const copy = await getSiteCopy();
  if (!copy.features.localesEnabled) redirect('/');
  return <LocaleLanding locale="kn" copy={copy.locales.kn} toolsEnabled={copy.features.toolsEnabled} />;
}
