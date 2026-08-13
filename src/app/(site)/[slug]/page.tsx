import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import CmsPageClient from '@/components/CmsPageClient';
import { getPageBySlug } from '@/lib/cms';
import { buildCmsMetadata } from '@/lib/cms-seo';
import { isReservedSiteSlug } from '@/lib/reserved-slugs';
import { verifyPreviewToken } from '@/lib/preview';

const SEED_FALLBACK_SLUGS = new Set(['privacy', 'terms']);

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (isReservedSiteSlug(slug)) return {};
  return buildCmsMetadata(slug);
}

export default async function DynamicCmsPage({ params, searchParams }: Props) {
  const { slug } = await params;
  if (isReservedSiteSlug(slug)) notFound();

  const sp = await searchParams;
  const previewFlag = sp.preview === '1' || (Array.isArray(sp.preview) && sp.preview[0] === '1');
  const tokenRaw = sp.token;
  const token = Array.isArray(tokenRaw) ? tokenRaw[0] : tokenRaw;
  const allowPreview = Boolean(previewFlag && verifyPreviewToken(slug, token || null));

  const page = await getPageBySlug(slug, allowPreview);
  if (!page && !SEED_FALLBACK_SLUGS.has(slug)) notFound();

  return <CmsPageClient slug={slug} />;
}
