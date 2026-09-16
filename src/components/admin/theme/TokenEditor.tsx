'use client';

import {
  THEME_TOKEN_GROUPS,
  THEME_TOKEN_META,
  type ThemeTokenGroup,
} from '@/lib/theme-tokens';
import AdminCollapsible from '@/components/admin/AdminCollapsible';

type Props = {
  tokens: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
};

function toColorInputValue(value: string): string {
  const v = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(v)) return v;
  if (/^#[0-9a-fA-F]{3}$/.test(v)) {
    const r = v[1];
    const g = v[2];
    const b = v[3];
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return '#000000';
}

export default function TokenEditor({ tokens, onChange }: Props) {
  const setToken = (key: string, value: string) => {
    onChange({ ...tokens, [key]: value });
  };

  return (
    <div className="theme-token-editor admin-page-stack">
      {THEME_TOKEN_GROUPS.map((group, index) => {
        const items = THEME_TOKEN_META.filter((t) => t.group === group.id);
        if (!items.length) return null;
        return (
          <AdminCollapsible
            key={group.id}
            title={group.label}
            defaultOpen={index === 0}
            className="theme-token-group-collapse"
          >
            <div className="theme-token-grid" data-group={group.id as ThemeTokenGroup}>
              {items.map((meta) => {
                const value = tokens[meta.key] ?? '';
                return (
                  <div className="theme-token-field" key={meta.key}>
                    <label htmlFor={`token-${meta.key}`}>
                      <span>{meta.label}</span>
                      <code>{meta.key}</code>
                    </label>
                    {meta.type === 'color' ? (
                      <div className="theme-color-row">
                        <input
                          type="color"
                          aria-label={`${meta.label} color`}
                          value={toColorInputValue(value)}
                          onChange={(e) => setToken(meta.key, e.target.value)}
                        />
                        <input
                          id={`token-${meta.key}`}
                          className="admin-input"
                          value={value}
                          onChange={(e) => setToken(meta.key, e.target.value)}
                        />
                      </div>
                    ) : (
                      <input
                        id={`token-${meta.key}`}
                        className="admin-input"
                        value={value}
                        onChange={(e) => setToken(meta.key, e.target.value)}
                        placeholder={meta.type === 'size' ? 'e.g. 1rem' : 'CSS value'}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </AdminCollapsible>
        );
      })}
    </div>
  );
}
