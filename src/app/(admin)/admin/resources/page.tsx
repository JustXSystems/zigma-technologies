import BlogHub from '@/components/admin/blog/BlogHub';

export default async function BlogAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { tab, post } = await searchParams;
  return <BlogHub initialTab={typeof tab === 'string' ? tab : undefined} initialPost={typeof post === 'string' ? post : undefined} />;
}
