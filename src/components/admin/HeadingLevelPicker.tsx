'use client';

import {
  HEADING_LEVELS,
  sanitizeHeadingLevel,
  type SiteSettings,
} from '@/lib/site-settings';

type Props = {
  settings: SiteSettings;
  onChange: (patch: Partial<SiteSettings>) => void;
};

const ROLES: Array<{
  key: 'headingPageHero' | 'headingSection';
  title: string;
  hint: string;
  example: string;
}> = [
  {
    key: 'headingPageHero',
    title: 'Page heroes & primary titles',
    hint: 'Homepage slides, inner page heroes, catalog listing heroes, case-study heroes.',
    example: 'Reliable Power. Preserved Productivity.',
  },
  {
    key: 'headingSection',
    title: 'Section titles',
    hint: 'Section heads, eco / split blocks, project & industry bands, CTA titles.',
    example: 'One Partner. One Responsibility.',
  },
];

export default function HeadingLevelPicker({ settings, onChange }: Props) {
  return (
    <div className="admin-heading-level-picker">
      <p className="admin-muted" style={{ marginTop: 0, marginBottom: '1rem', maxWidth: 640 }}>
        Choose the HTML heading tag (and matching type size) for public titles. Defaults stay at{' '}
        <strong>H3</strong> for a denser page. Switch a role to H2 or H1 when you want more emphasis —
        layout styles already accept any of the three tags.
      </p>
      <div className="admin-form-grid" style={{ gap: '1.25rem' }}>
        {ROLES.map((role) => {
          const selected = sanitizeHeadingLevel(settings[role.key], 'h3');
          return (
            <div key={role.key} className="admin-field full" style={{ marginBottom: 0 }}>
              <label>{role.title}</label>
              <small style={{ display: 'block', color: 'var(--admin-muted)', marginBottom: '0.55rem' }}>
                {role.hint}
              </small>
              <div
                role="radiogroup"
                aria-label={role.title}
                style={{ display: 'grid', gap: '0.45rem' }}
              >
                {HEADING_LEVELS.map((level) => {
                  const active = selected === level.id;
                  return (
                    <label
                      key={level.id}
                      className={`admin-nav-style-card${active ? ' is-active' : ''}`}
                      style={{ padding: '0.7rem 0.85rem', cursor: 'pointer' }}
                    >
                      <input
                        type="radio"
                        name={role.key}
                        value={level.id}
                        checked={active}
                        onChange={() => onChange({ [role.key]: level.id })}
                        style={{ marginRight: '0.55rem' }}
                      />
                      <span className="admin-nav-style-copy" style={{ display: 'inline' }}>
                        <strong>{level.label}</strong>
                        <small style={{ display: 'block', marginTop: 2 }}>{level.description}</small>
                      </span>
                    </label>
                  );
                })}
              </div>
              <div
                aria-hidden
                style={{
                  marginTop: '0.75rem',
                  padding: '0.85rem 1rem',
                  borderRadius: 8,
                  border: '1px solid var(--admin-border, #e2e8f0)',
                  background: 'var(--admin-surface-2, #f8fafc)',
                }}
              >
                <div
                  style={{
                    fontFamily: 'var(--font-display, Space Grotesk, sans-serif)',
                    fontWeight: 700,
                    letterSpacing: '-0.02em',
                    lineHeight: 1.15,
                    fontSize:
                      selected === 'h1'
                        ? '1.65rem'
                        : selected === 'h2'
                          ? '1.4rem'
                          : '1.15rem',
                  }}
                >
                  {role.example}
                </div>
                <small style={{ color: 'var(--admin-muted)' }}>Preview scale · {selected.toUpperCase()}</small>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
