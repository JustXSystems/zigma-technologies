import { z } from 'zod';
import { requireAdmin, requireSession } from '@/lib/auth';
import { jsonError, jsonOk, readJson } from '@/lib/api';
import {
  DEFAULT_THEME_TOKENS,
} from '@/lib/homepage-seed';
import {
  getLatestCssDraft,
  getPublishedCssOverride,
  getThemeSettings,
  listCssOverrides,
  publishCssOverride,
  saveCssDraft,
  upsertThemeSetting,
} from '@/lib/cms';

export async function GET() {
  try {
    await requireSession();
    const [theme, published, draft, history] = await Promise.all([
      getThemeSettings(),
      getPublishedCssOverride(),
      getLatestCssDraft(),
      listCssOverrides(),
    ]);
    return jsonOk({
      tokens: (theme.tokens as Record<string, string>) || DEFAULT_THEME_TOKENS,
      published,
      draft,
      history,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    return jsonError('Failed to load theme', 500);
  }
}

const putSchema = z.object({
  tokens: z.record(z.string(), z.string()).optional(),
  css_text: z.string().optional(),
  notes: z.string().optional(),
  publish_id: z.number().optional(),
});

export async function PUT(request: Request) {
  try {
    await requireAdmin();
    const body = putSchema.parse(await readJson(request));

    if (body.tokens) {
      await upsertThemeSetting('tokens', body.tokens);
    }

    let draftId: number | null = null;
    if (typeof body.css_text === 'string') {
      draftId = await saveCssDraft(body.css_text, body.notes);
    }

    if (body.publish_id) {
      await publishCssOverride(body.publish_id);
    } else if (draftId && body.notes === 'publish-now') {
      await publishCssOverride(draftId);
    }

    const [theme, published, draft, history] = await Promise.all([
      getThemeSettings(),
      getPublishedCssOverride(),
      getLatestCssDraft(),
      listCssOverrides(),
    ]);

    return jsonOk({
      tokens: (theme.tokens as Record<string, string>) || DEFAULT_THEME_TOKENS,
      published,
      draft,
      history,
      draftId,
    });
  } catch (error) {
    if (error instanceof z.ZodError) return jsonError('Invalid payload', 400);
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    if (error instanceof Error && error.message === 'FORBIDDEN') return jsonError('Forbidden', 403);
    console.error(error);
    return jsonError(error instanceof Error ? error.message : 'Save failed', 500);
  }
}
