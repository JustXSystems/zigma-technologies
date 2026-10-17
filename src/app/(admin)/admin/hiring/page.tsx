import HiringHub from '@/components/admin/hiring/HiringHub';

export default async function HiringAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { tab, job } = await searchParams;
  return <HiringHub initialTab={typeof tab === 'string' ? tab : undefined} initialJob={typeof job === 'string' ? job : undefined} />;
}
