'use client';

import { useMemo, type CSSProperties } from 'react';
import type { SiteSettings } from '@/lib/site-settings';
import { LOGO_STYLE_OPTIONS, LOGO_WEIGHT_OPTIONS, resolveLogoFontCss } from '@/lib/logo-fonts';
import {
  NAV_TRANSFORM_OPTIONS,
  NAV_TYPE_GROUPS,
  NAV_TYPE_PRESET_HINTS,
  parseNavTypography,
  resolveNavTypeFields,
  serializeNavTypography,
  type NavTypeFields,
  type NavTypeGroupId,
} from '@/lib/nav-typography';
import LogoFontPicker from '@/components/admin/LogoFontPicker';

type Props = {
  settings: SiteSettings;
  onChange: (patch: Partial<SiteSettings>) => void;
};

const WEIGHT_OPTIONS = [{ value: '', label: 'Preset default' }, ...LOGO_WEIGHT_OPTIONS];
const STYLE_OPTIONS = [{ value: '', label: 'Preset default' }, ...LOGO_STYLE_OPTIONS];

function previewStyle(group: NavTypeGroupId, fields: NavTypeFields): CSSProperties {
  const t = resolveNavTypeFields(fields);
  const d = NAV_TYPE_PRESET_HINTS[group];
  return {
    fontFamily: resolveLogoFontCss(t.font || d.font, d.font),
    fontSize: t.size || d.size,
    fontWeight: t.weight || d.weight,
    fontStyle: t.style || d.style,
    letterSpacing: t.letterSpacing || d.letterSpacing,
    textTransform: (t.transform || d.transform) as CSSProperties['textTransform'],
  };
}

export default function NavTypographyEditor({ settings, onChange }: Props) {
  const value = useMemo(() => parseNavTypography(settings.navTypographyJson), [settings.navTypographyJson]);

  const set = (group: NavTypeGroupId, key: keyof NavTypeFields, next: string) => {
    const updated = { ...value, [group]: { ...value[group], [key]: next } };
    onChange({ navTypographyJson: serializeNavTypography(updated) });
  };

  const resetGroup = (group: NavTypeGroupId) => {
    const updated = {
      ...value,
      [group]: { font: '', size: '', sizeMobile: '', weight: '', style: '', letterSpacing: '', transform: '' },
    };
    onChange({ navTypographyJson: serializeNavTypography(updated) });
  };

  const top = previewStyle('top', value.top);
  const heading = previewStyle('heading', value.heading);
  const link = previewStyle('link', value.link);

  return (
    <div className="admin-page-stack nav-type-editor">
      <p className="admin-muted" style={{ marginTop: 0, maxWidth: 680 }}>
        Override header navigation fonts. Leave a field blank (or <em>Preset default</em>) to keep the look of the
        selected navigation menu style. Sizes accept <code>px</code>, <code>rem</code> or <code>em</code>; mobile
        sizes apply at 760px and below.
      </p>

      <div className="nav-type-preview" aria-hidden>
        <div className="nav-type-preview-bar">
          <span style={top}>Who We Are ▾</span>
          <span style={top}>What We Do ▾</span>
          <span style={top}>Projects</span>
          <span style={top}>Contact</span>
        </div>
        <div className="nav-type-preview-panel">
          {[
            ['About Us', 'About Zigma', '20+ Years Legacy'],
            ['Generate', 'Solar EPC Solutions', 'Solar AMC - O&M'],
          ].map(([h, a, b]) => (
            <div key={h}>
              <div className="nav-type-preview-heading" style={heading}>
                {h}
              </div>
              <div style={link}>{a}</div>
              <div style={link}>{b}</div>
            </div>
          ))}
        </div>
      </div>

      {NAV_TYPE_GROUPS.map((group) => {
        const fields = value[group.id];
        const hints = NAV_TYPE_PRESET_HINTS[group.id];
        const idp = `nav-type-${group.id}`;
        return (
          <div key={group.id} className="logo-type-block">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'start' }}>
              <div>
                <h3 className="logo-type-block-title">{group.label}</h3>
                <small className="admin-muted">{group.description}</small>
              </div>
              <button type="button" className="admin-btn admin-btn-secondary" onClick={() => resetGroup(group.id)}>
                Reset
              </button>
            </div>
            <div className="admin-form-grid" style={{ marginTop: '0.75rem' }}>
              <LogoFontPicker
                id={`${idp}-font`}
                label="Font"
                value={fields.font}
                onChange={(v) => set(group.id, 'font', v)}
                emptyLabel="Preset default"
                hint="Site fonts load for every visitor; other faces must be installed on the visitor's device"
              />
              <div className="admin-field">
                <label htmlFor={`${idp}-size`}>Size (desktop)</label>
                <input
                  id={`${idp}-size`}
                  className="admin-input"
                  value={fields.size}
                  placeholder={hints.size}
                  onChange={(e) => set(group.id, 'size', e.target.value)}
                />
                <small className="admin-muted">Classic preset: {hints.size}</small>
              </div>
              <div className="admin-field">
                <label htmlFor={`${idp}-size-mobile`}>Size (mobile)</label>
                <input
                  id={`${idp}-size-mobile`}
                  className="admin-input"
                  value={fields.sizeMobile}
                  placeholder={hints.sizeMobile}
                  onChange={(e) => set(group.id, 'sizeMobile', e.target.value)}
                />
                <small className="admin-muted">Classic preset: {hints.sizeMobile}</small>
              </div>
              <div className="admin-field">
                <label htmlFor={`${idp}-weight`}>Weight</label>
                <select
                  id={`${idp}-weight`}
                  className="admin-input"
                  value={fields.weight}
                  onChange={(e) => set(group.id, 'weight', e.target.value)}
                >
                  {WEIGHT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="admin-field">
                <label htmlFor={`${idp}-style`}>Style</label>
                <select
                  id={`${idp}-style`}
                  className="admin-input"
                  value={fields.style}
                  onChange={(e) => set(group.id, 'style', e.target.value)}
                >
                  {STYLE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="admin-field">
                <label htmlFor={`${idp}-case`}>Letter case</label>
                <select
                  id={`${idp}-case`}
                  className="admin-input"
                  value={fields.transform}
                  onChange={(e) => set(group.id, 'transform', e.target.value)}
                >
                  {NAV_TRANSFORM_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="admin-field">
                <label htmlFor={`${idp}-tracking`}>Letter spacing</label>
                <input
                  id={`${idp}-tracking`}
                  className="admin-input"
                  value={fields.letterSpacing}
                  placeholder={hints.letterSpacing}
                  onChange={(e) => set(group.id, 'letterSpacing', e.target.value)}
                />
                <small className="admin-muted">e.g. 0, 0.05em, 1px</small>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
