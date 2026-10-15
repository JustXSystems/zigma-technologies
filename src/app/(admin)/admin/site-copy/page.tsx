import SiteCopyHub from '@/components/admin/site-copy/SiteCopyHub';

export default async function SiteCopyPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { tab } = await searchParams;
  return <SiteCopyHub initialTab={typeof tab === 'string' ? tab : undefined} />;
}
