import ZtoolsToolPageClient from '@/components/ztools/ZtoolsToolPageClient';

export default async function ZtoolsToolPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <ZtoolsToolPageClient slug={slug} />;
}
