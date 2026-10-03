import SeoHub from '@/components/admin/seo/SeoHub';

export default async function SeoPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { tab } = await searchParams;
  return <SeoHub initialTab={typeof tab === 'string' ? tab : undefined} />;
}
