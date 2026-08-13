import { jsonError, jsonOk } from '@/lib/api';
import { listTestimonials } from '@/lib/testimonials';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const featured = searchParams.get('featured') === '1';
    const locale = searchParams.get('locale') || undefined;
    const items = await listTestimonials({ featuredOnly: featured, locale });
    return jsonOk({ items });
  } catch (error) {
    console.error(error);
    return jsonError('Failed to load testimonials', 500);
  }
}
