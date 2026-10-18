const WEIGHTS = {
  technical: 0.35,
  onpage: 0.25,
  local: 0.15,
  authority: 0.1,
  signals: 0.15,
};

const SEVERITY_PENALTY = {
  critical: 18,
  high: 10,
  medium: 5,
  low: 2,
  info: 0,
};

/**
 * @param {{ findings: object[], connectors: object[] }} input
 */
export function buildScorecard({ findings, connectors }) {
  const byPillar = {
    technical: 100,
    onpage: 100,
    local: 100,
    authority: 85, // no backlink connector yet — soft baseline
    signals: 100,
  };

  for (const f of findings) {
    const pillar = f.pillar && byPillar[f.pillar] !== undefined ? f.pillar : 'technical';
    byPillar[pillar] = Math.max(0, byPillar[pillar] - (SEVERITY_PENALTY[f.severity] || 0));
  }

  // Signals: live OK connectors lift score; auth_required keeps a floor
  const signalConnectors = connectors.filter((c) => ['gsc', 'ga4', 'bing', 'pagespeed'].includes(c.id));
  const enabled = signalConnectors.filter((c) => c.status !== 'skipped');
  if (enabled.length) {
    const okish = enabled.filter((c) => c.status === 'ok').length;
    const authNeeded = enabled.filter((c) => c.status === 'auth_required').length;
    const errors = enabled.filter((c) => c.status === 'error').length;
    const ratio = okish / enabled.length;
    byPillar.signals = Math.round(35 + ratio * 65 - authNeeded * 6 - errors * 10);
    byPillar.signals = Math.max(20, Math.min(100, byPillar.signals));
  } else {
    byPillar.signals = 50;
  }

  let overall = 0;
  for (const [k, w] of Object.entries(WEIGHTS)) {
    overall += byPillar[k] * w;
  }
  overall = Math.round(overall);

  const grade =
    overall >= 90 ? 'A' : overall >= 80 ? 'B' : overall >= 70 ? 'C' : overall >= 55 ? 'D' : 'F';

  return {
    overall,
    grade,
    pillars: byPillar,
    weights: WEIGHTS,
    summary:
      overall >= 85
        ? 'Command desk green — technical foundation is strong; connect signals for full visibility.'
        : overall >= 70
          ? 'Operational — clear findings to close before treating SEO as “done”.'
          : 'Attention — critical technical or staging issues are blocking trust.',
  };
}

/**
 * Ordered roadmap from findings + connector gaps.
 */
export function buildRoadmap({ findings, connectors, profile }) {
  const items = [];
  const crit = findings.filter((f) => f.severity === 'critical' || f.severity === 'high');
  for (const f of crit.slice(0, 8)) {
    items.push({
      priority: items.length + 1,
      title: f.title,
      owner: f.owner,
      phase: f.pillar === 'signals' ? '0/1.7' : f.pillar === 'local' ? '2/5' : '1/2',
      fromFinding: f.code,
    });
  }
  for (const c of connectors) {
    if (c.status === 'auth_required') {
      items.push({
        priority: items.length + 1,
        title: `Connect ${c.label}`,
        owner: 'ops',
        phase: 'M1',
        fromFinding: `connector:${c.id}`,
      });
    }
  }
  if (profile.indexable && !items.some((i) => /Search Console|sitemap/i.test(i.title))) {
    items.push({
      priority: items.length + 1,
      title: 'Confirm Search Console sitemap submit + indexing requests',
      owner: 'marketing',
      phase: '1.7',
      fromFinding: 'playbook',
    });
  }
  return items.slice(0, 12);
}
