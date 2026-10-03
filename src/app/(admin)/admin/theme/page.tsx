import ThemeHub from '@/components/admin/theme/ThemeHub';

export default async function ThemeAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { tab } = await searchParams;
  return <ThemeHub initialTab={typeof tab === 'string' ? tab : undefined} />;
}
