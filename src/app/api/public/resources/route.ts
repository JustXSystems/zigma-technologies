import { jsonError, jsonOk } from '@/lib/api';
import { listResourcePosts } from '@/lib/resources';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || undefined;
    const tag = searchParams.get('tag') || undefined;
    const posts = await listResourcePosts({ q, tag });
    return jsonOk({ posts });
  } catch (error) {
    console.error(error);
    return jsonError('Failed to list resources', 500);
  }
}
