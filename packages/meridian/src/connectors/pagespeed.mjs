/**
 * PageSpeed Insights / CrUX (lab + field when available).
 * Env: MERIDIAN_PSI_API_KEY (optional but recommended for quota)
 */

export async function collectPagespeed(profile) {
  const cfg = profile.connectors?.pagespeed || {};
  if (!cfg.enabled) {
    return { id: 'pagespeed', label: 'PageSpeed / CrUX', status: 'skipped', message: 'Disabled in profile' };
  }

  const key = (process.env.MERIDIAN_PSI_API_KEY || '').trim();
  const url = (cfg.url || profile.origin).replace(/\/$/, '') + '/';
  const params = new URLSearchParams({
    url,
    category: 'PERFORMANCE',
    strategy: 'mobile',
  });
  if (key) params.set('key', key);

  try {
    const res = await fetch(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data?.error?.message || `PageSpeed API ${res.status}`;
      return {
        id: 'pagespeed',
        label: 'PageSpeed / CrUX',
        status: res.status === 429 || /quota|key/i.test(msg) ? 'auth_required' : 'error',
        message: key ? msg : `${msg} — set MERIDIAN_PSI_API_KEY for reliable quota`,
        data: { url },
      };
    }

    const lighthouse = data.lighthouseResult || {};
    const categories = lighthouse.categories || {};
    const audits = lighthouse.audits || {};
    const loading = data.loadingExperience?.metrics || {};
    const origin = data.originLoadingExperience?.metrics || {};

    const score = Math.round((categories.performance?.score || 0) * 100);
    const pick = (id) => {
      const a = audits[id];
      return a
        ? {
            title: a.title,
            displayValue: a.displayValue,
            numericValue: a.numericValue,
            score: a.score,
          }
        : null;
    };

    const field = (metrics, name) => {
      const m = metrics[name];
      return m
        ? {
            percentile: m.percentile,
            category: m.category,
          }
        : null;
    };

    return {
      id: 'pagespeed',
      label: 'PageSpeed / CrUX',
      status: 'ok',
      message: `Mobile performance ${score}/100 (lab)${loading.LARGEST_CONTENTFUL_PAINT_MS ? ' · field CWV present' : ''}`,
      data: {
        url,
        strategy: 'mobile',
        performanceScore: score,
        lab: {
          lcp: pick('largest-contentful-paint'),
          cls: pick('cumulative-layout-shift'),
          inp: pick('interaction-to-next-paint') || pick('experimental-interaction-to-next-paint'),
          tbt: pick('total-blocking-time'),
        },
        fieldUrl: {
          lcp: field(loading, 'LARGEST_CONTENTFUL_PAINT_MS'),
          cls: field(loading, 'CUMULATIVE_LAYOUT_SHIFT_SCORE'),
          inp: field(loading, 'INTERACTION_TO_NEXT_PAINT'),
        },
        fieldOrigin: {
          lcp: field(origin, 'LARGEST_CONTENTFUL_PAINT_MS'),
          cls: field(origin, 'CUMULATIVE_LAYOUT_SHIFT_SCORE'),
          inp: field(origin, 'INTERACTION_TO_NEXT_PAINT'),
        },
      },
    };
  } catch (e) {
    return {
      id: 'pagespeed',
      label: 'PageSpeed / CrUX',
      status: 'error',
      message: String(e.message || e),
      data: { url },
    };
  }
}
