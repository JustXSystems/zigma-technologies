import { googleEnvStatus, googleFetch } from './google-auth.mjs';

/**
 * GA4 Data API — organic search sessions + key events (last 28 days).
 * Env: MERIDIAN_GA4_PROPERTY_ID (numeric, e.g. 123456789) + Google OAuth env.
 */
export async function collectGa4(profile) {
  const cfg = profile.connectors?.ga4 || {};
  if (!cfg.enabled) {
    return { id: 'ga4', label: 'Google Analytics 4', status: 'skipped', message: 'Disabled in profile' };
  }

  const propertyId = (process.env.MERIDIAN_GA4_PROPERTY_ID || cfg.propertyId || '').trim();
  const auth = googleEnvStatus();
  const missing = [...(auth.missing || [])];
  if (!propertyId) missing.push('MERIDIAN_GA4_PROPERTY_ID');
  if (missing.length) {
    return {
      id: 'ga4',
      label: 'Google Analytics 4',
      status: 'auth_required',
      message: `Missing: ${missing.join(', ')}. Property ID is numeric (Admin → Property settings), not the G- measurement ID.`,
      data: { measurementIdHint: cfg.measurementIdHint || null },
    };
  }

  try {
    const end = new Date();
    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - 28);
    const startDate = start.toISOString().slice(0, 10);
    const endDate = end.toISOString().slice(0, 10);

    const report = await googleFetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        method: 'POST',
        body: {
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: 'sessionDefaultChannelGroup' }],
          metrics: [{ name: 'sessions' }, { name: 'keyEvents' }, { name: 'totalUsers' }],
        },
      }
    );

    const rows = Array.isArray(report.rows) ? report.rows : [];
    const channels = rows.map((r) => ({
      channel: r.dimensionValues?.[0]?.value || '(unknown)',
      sessions: Number(r.metricValues?.[0]?.value || 0),
      keyEvents: Number(r.metricValues?.[1]?.value || 0),
      users: Number(r.metricValues?.[2]?.value || 0),
    }));
    const organic = channels.find((c) => /organic/i.test(c.channel)) || null;
    const totals = channels.reduce(
      (acc, c) => {
        acc.sessions += c.sessions;
        acc.keyEvents += c.keyEvents;
        acc.users += c.users;
        return acc;
      },
      { sessions: 0, keyEvents: 0, users: 0 }
    );

    return {
      id: 'ga4',
      label: 'Google Analytics 4',
      status: 'ok',
      message: organic
        ? `Organic ${organic.sessions} sessions / ${organic.keyEvents} key events (28d)`
        : `Connected · ${totals.sessions} sessions across channels (28d)`,
      data: {
        propertyId,
        window: { startDate, endDate },
        organic,
        channels,
        totals,
        measurementIdHint: cfg.measurementIdHint || null,
      },
    };
  } catch (e) {
    return {
      id: 'ga4',
      label: 'Google Analytics 4',
      status: e.code === 'AUTH_REQUIRED' ? 'auth_required' : 'error',
      message: String(e.message || e),
      data: { propertyId },
    };
  }
}
