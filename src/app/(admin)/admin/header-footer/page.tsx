import HeaderFooterHub from '@/components/admin/header-footer/HeaderFooterHub';

export default async function HeaderFooterPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { tab } = await searchParams;
  return <HeaderFooterHub initialTab={typeof tab === 'string' ? tab : undefined} />;
}
