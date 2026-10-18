export function renderMarkdownReport(report) {
  const { meta, scorecard, findings, connectors, roadmap, profile } = report;
  const lines = [
    `# Meridian · ${profile.displayName || profile.id}`,
    '',
    `- Origin: ${profile.origin}`,
    `- Run: ${meta.runId}`,
    `- Finished: ${meta.finishedAt}`,
    `- Score: **${scorecard.overall}** (grade ${scorecard.grade})`,
    '',
    scorecard.summary,
    '',
    '## Pillars',
    '',
    ...Object.entries(scorecard.pillars).map(([k, v]) => `- ${k}: ${v}`),
    '',
    '## Connectors',
    '',
    ...connectors.map((c) => `- **${c.label}** — \`${c.status}\` — ${c.message || ''}`),
    '',
    '## Roadmap',
    '',
    ...(roadmap || []).map((r) => `${r.priority}. ${r.title} _(owner: ${r.owner}, phase ${r.phase})_`),
    '',
    '## Findings',
    '',
  ];
  if (!findings.length) lines.push('_None._', '');
  for (const f of findings) {
    lines.push(
      `### [${f.severity}] ${f.title}`,
      '',
      `- Code: \`${f.code}\``,
      `- ${f.detail}`,
      f.evidence ? `- Evidence: ${f.evidence}` : '',
      `- Fix: ${f.remediation}`,
      ''
    );
  }
  return lines.filter((l) => l !== '').join('\n') + '\n';
}
