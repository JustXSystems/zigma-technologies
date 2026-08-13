import { NextResponse } from 'next/server';
import { getPublishedCssOverride, getThemeSettings } from '@/lib/cms';
import { DEFAULT_THEME_TOKENS } from '@/lib/homepage-seed';

export async function GET() {
  try {
    const theme = await getThemeSettings();
    const tokens = (theme.tokens as Record<string, string>) || DEFAULT_THEME_TOKENS;
    const published = await getPublishedCssOverride();

    const tokenCss = `:root{\n${Object.entries(tokens)
      .map(([k, v]) => `  ${k}:${v};`)
      .join('\n')}\n}\n`;

    const css = `${tokenCss}\n/* published overrides v${published?.version || 0} */\n${published?.css_text || ''}\n`;

    return new NextResponse(css, {
      headers: {
        'Content-Type': 'text/css; charset=utf-8',
        'Cache-Control': 'public, max-age=30',
      },
    });
  } catch {
    const tokenCss = `:root{\n${Object.entries(DEFAULT_THEME_TOKENS)
      .map(([k, v]) => `  ${k}:${v};`)
      .join('\n')}\n}\n`;
    return new NextResponse(tokenCss, {
      headers: { 'Content-Type': 'text/css; charset=utf-8' },
    });
  }
}
