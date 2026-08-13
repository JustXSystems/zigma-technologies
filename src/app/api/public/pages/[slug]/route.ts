import { jsonError, jsonOk } from '@/lib/api';
import { loadPublicCmsPage } from '@/lib/cms-public-page';
import { verifyPreviewToken } from '@/lib/preview';

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(request: Request, ctx: Ctx) {
  try {
    const { slug } = await ctx.params;
    const { searchParams } = new URL(request.url);
    const preview = searchParams.get('preview') === '1';
    const token = searchParams.get('token');
    const allowPreview = preview && verifyPreviewToken(slug, token);

    const result = await loadPublicCmsPage(slug, allowPreview);
    if (!result) return jsonError('Page not found', 404);

    return jsonOk(result);
  } catch (error) {
    console.error(error);
    return jsonError('Failed to load page', 500);
  }
}
