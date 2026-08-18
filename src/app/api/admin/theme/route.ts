import { z } from 'zod';
import { requireScreen } from '@/lib/auth';
import { jsonError, jsonOk, readJson } from '@/lib/api';
import {
  DEFAULT_THEME_TOKENS,
  mergeTokens,
  pickAllowedTokens,
  sanitizeCssOverride,
} from '@/lib/theme-tokens';
import { tryWritePublishedSiteCss } from '@/lib/site-css';
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
    await requireScreen('theme');
    const [theme, published, draft, history] = await Promise.all([
      getThemeSettings(),
      getPublishedCssOverride(),
      getLatestCssDraft(),
      listCssOverrides(),
    ]);
    return jsonOk({
      tokens: mergeTokens(theme.tokens),
      defaults: DEFAULT_THEME_TOKENS,
      published,
      draft,
      history,
      hasFullStylesheet: Boolean(published?.css_text && published.css_text.length > 8_000),
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
  /** When true after publish, also write globals.css on disk if FS is writable */
  sync_files: z.boolean().optional(),
});

export async function PUT(request: Request) {
  try {
    await requireScreen('theme');
    const body = putSchema.parse(await readJson(request));

    if (body.tokens) {
      const allowed = pickAllowedTokens(body.tokens);
      await upsertThemeSetting('tokens', allowed);
    }

    let draftId: number | null = null;
    if (typeof body.css_text === 'string') {
      const sanitized = sanitizeCssOverride(body.css_text);
      if (!sanitized.ok) return jsonError(sanitized.error, 400);
      draftId = await saveCssDraft(sanitized.css, body.notes);
    }

    let didPublish = false;
    if (body.publish_id) {
      await publishCssOverride(body.publish_id);
      didPublish = true;
    } else if (draftId && body.notes === 'publish-now') {
      await publishCssOverride(draftId);
      didPublish = true;
    }

    let fileSync: { wroteApp: boolean; wrotePublic: boolean } | null = null;
    if (didPublish && body.sync_files !== false) {
      const publishedNow = await getPublishedCssOverride();
      if (publishedNow?.css_text) {
        fileSync = tryWritePublishedSiteCss(publishedNow.css_text);
      }
    }

    const [theme, published, draft, history] = await Promise.all([
      getThemeSettings(),
      getPublishedCssOverride(),
      getLatestCssDraft(),
      listCssOverrides(),
    ]);

    return jsonOk({
      tokens: mergeTokens(theme.tokens),
      defaults: DEFAULT_THEME_TOKENS,
      published,
      draft,
      history,
      draftId,
      fileSync,
      hasFullStylesheet: Boolean(published?.css_text && published.css_text.length > 8_000),
    });
  } catch (error) {
    if (error instanceof z.ZodError) return jsonError('Invalid payload', 400);
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    if (error instanceof Error && error.message === 'FORBIDDEN') return jsonError('Forbidden', 403);
    console.error(error);
    return jsonError(error instanceof Error ? error.message : 'Save failed', 500);
  }
}
