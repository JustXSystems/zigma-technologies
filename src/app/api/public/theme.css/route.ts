import { NextResponse } from 'next/server';
import { getPublishedCssOverride, getThemeSettings } from '@/lib/cms';
import { mergeTokens, tokensToCss } from '@/lib/theme-tokens';

/**
 * Serves published site CSS (full globals body or additive overrides) then token overlay.
 * Loaded after the Next-bundled globals.css so published rules win on equal specificity.
 */
export async function GET() {
  try {
    const theme = await getThemeSettings();
    const tokens = mergeTokens(theme.tokens);
    const published = await getPublishedCssOverride();
    const sheet = published?.css_text || '';

    const css = [
      `/* published site stylesheet v${published?.version || 0} */`,
      sheet,
      '',
      '/* Theme Studio token overlay */',
      tokensToCss(tokens),
    ].join('\n');

    return new NextResponse(css, {
      headers: {
        'Content-Type': 'text/css; charset=utf-8',
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
      },
    });
  } catch {
    return new NextResponse(tokensToCss({}), {
      headers: { 'Content-Type': 'text/css; charset=utf-8' },
    });
  }
}
