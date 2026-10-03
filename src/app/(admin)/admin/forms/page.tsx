import LeadsHub from '@/components/admin/leads/LeadsHub';

export default async function FormsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { tab } = await searchParams;
  return <LeadsHub initialTab={typeof tab === 'string' ? tab : undefined} />;
}
