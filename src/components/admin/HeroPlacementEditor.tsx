'use client';

import { useId } from 'react';
import {
  HERO_ANCHORS,
  isHeroAnchor,
  type HeroAnchor,
  type HeroPlacement,
  type HeroPlacementFrame,
  type HeroSlotConfig,
  type HeroSlotName,
  type HeroSlotPlacement,
} from '@/lib/hero-placement';

export type HeroPlacementSlotOption = { name: HeroSlotName; label: string };

const DEFAULT_SLOTS: HeroPlacementSlotOption[] = [{ name: 'text', label: 'Text block' }];

const ANCHOR_LABEL: Record<HeroAnchor, string> = {
  'top-left': 'Top left',
  'top-center': 'Top centre',
  'top-right': 'Top right',
  'center-left': 'Middle left',
  center: 'Centre',
  'center-right': 'Middle right',
  'bottom-left': 'Bottom left',
  'bottom-center': 'Bottom centre',
  'bottom-right': 'Bottom right',
};

function offsetHint(anchor: HeroAnchor | undefined, axis: 'x' | 'y') {
  if (!anchor) return '';
  const [v, h] = anchor === 'center' ? ['center', 'center'] : anchor.split('-');
  const side = axis === 'x' ? h : v;
  if (side === 'center') return axis === 'x' ? '+ right / − left' : '+ down / − up';
  return `gap from ${side}`;
}

function hasPlacement(p: HeroSlotPlacement | undefined): p is HeroSlotPlacement {
  return isHeroAnchor(p?.anchor);
}

function prune(value: HeroPlacement): HeroPlacement | undefined {
  const slots: HeroPlacement['slots'] = {};
  for (const [name, cfg] of Object.entries(value.slots || {}) as [HeroSlotName, HeroSlotConfig | undefined][]) {
    const next: HeroSlotConfig = {};
    if (hasPlacement(cfg?.desktop)) next.desktop = cfg.desktop;
    if (hasPlacement(cfg?.mobile)) next.mobile = cfg.mobile;
    if (next.desktop || next.mobile) slots[name] = next;
  }
  if (!Object.keys(slots).length) return undefined;
  return { ...(value.frame === 'edge' ? { frame: 'edge' as const } : {}), slots };
}

function AnchorPad({
  value,
  onChange,
  label,
  disabled,
}: {
  value: HeroAnchor | undefined;
  onChange: (anchor: HeroAnchor | undefined) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <div className="hp-pad-wrap">
      <div className="hp-pad" role="radiogroup" aria-label={label}>
        {HERO_ANCHORS.map((a) => (
          <button
            key={a}
            type="button"
            role="radio"
            aria-checked={value === a}
            aria-label={ANCHOR_LABEL[a]}
            title={ANCHOR_LABEL[a]}
            className={`hp-pad-cell${value === a ? ' on' : ''}`}
            disabled={disabled}
            onClick={() => onChange(value === a ? undefined : a)}
          >
            <span />
          </button>
        ))}
      </div>
      <span className="hp-pad-caption">{value ? ANCHOR_LABEL[value] : 'Natural layout'}</span>
    </div>
  );
}

function SlotPlacementFields({
  value,
  onChange,
  label,
  widthPlaceholder,
  disabled,
}: {
  value: HeroSlotPlacement | undefined;
  onChange: (next: HeroSlotPlacement | undefined) => void;
  label: string;
  widthPlaceholder: string;
  disabled?: boolean;
}) {
  const id = useId();
  const anchor = isHeroAnchor(value?.anchor) ? value.anchor : undefined;
  const set = (patch: Partial<HeroSlotPlacement>) => onChange({ ...value, ...patch });
  const off = disabled || !anchor;
  return (
    <div className="hp-row">
      <AnchorPad
        label={label}
        value={anchor}
        disabled={disabled}
        onChange={(next) => (next ? set({ anchor: next }) : onChange(undefined))}
      />
      <div className="hp-inputs">
        <label htmlFor={`${id}-x`}>
          X <small>{offsetHint(anchor, 'x')}</small>
        </label>
        <input
          id={`${id}-x`}
          className="admin-input"
          value={value?.x || ''}
          placeholder="0px"
          disabled={off}
          onChange={(e) => set({ x: e.target.value })}
        />
        <label htmlFor={`${id}-y`}>
          Y <small>{offsetHint(anchor, 'y')}</small>
        </label>
        <input
          id={`${id}-y`}
          className="admin-input"
          value={value?.y || ''}
          placeholder="0px"
          disabled={off}
          onChange={(e) => set({ y: e.target.value })}
        />
        <label htmlFor={`${id}-w`}>Width</label>
        <input
          id={`${id}-w`}
          className="admin-input"
          value={value?.width || ''}
          placeholder={widthPlaceholder}
          disabled={off}
          onChange={(e) => set({ width: e.target.value })}
        />
      </div>
    </div>
  );
}

type Props = {
  value: unknown;
  onChange: (value: HeroPlacement | undefined) => void;
  /** Containers this hero has; defaults to the text block only. */
  slots?: HeroPlacementSlotOption[];
  label?: string;
  disabled?: boolean;
};

/** Pin each hero container (text, image / video, badge…) to an anchor with precise X / Y offsets. */
export default function HeroPlacementEditor({
  value,
  onChange,
  slots = DEFAULT_SLOTS,
  label = 'Container position',
  disabled,
}: Props) {
  const id = useId();
  const cfg = (value && typeof value === 'object' ? value : {}) as HeroPlacement;
  const commit = (next: HeroPlacement) => onChange(prune(next));
  const setSlot = (name: HeroSlotName, patch: Partial<HeroSlotConfig>) =>
    commit({ ...cfg, slots: { ...cfg.slots, [name]: { ...cfg.slots?.[name], ...patch } } });
  const anyDesktop = slots.some((s) => hasPlacement(cfg.slots?.[s.name]?.desktop));

  return (
    <div className="admin-field full hp-editor">
      <label htmlFor={`${id}-frame`}>{label}</label>
      <select
        id={`${id}-frame`}
        className="admin-select"
        disabled={disabled}
        value={cfg.frame === 'edge' ? 'edge' : 'content'}
        onChange={(e) => commit({ ...cfg, frame: e.target.value as HeroPlacementFrame })}
      >
        <option value="content">Measure from the content area (page margins, below the header)</option>
        <option value="edge">Measure from the hero edges</option>
      </select>
      {slots.map(({ name, label: slotLabel }) => {
        const slot = cfg.slots?.[name];
        const phone = hasPlacement(slot?.mobile);
        return (
          <fieldset key={name} className="hp-slot">
            <legend>{slotLabel}</legend>
            <p className="hp-device">Desktop &amp; tablet</p>
            <SlotPlacementFields
              label={`${slotLabel} anchor on desktop and tablet`}
              value={slot?.desktop}
              widthPlaceholder={name === 'text' ? '46rem' : '44%'}
              disabled={disabled}
              onChange={(desktop) => setSlot(name, { desktop })}
            />
            <label className="hp-toggle">
              <input
                type="checkbox"
                checked={phone}
                disabled={disabled}
                onChange={(e) =>
                  setSlot(name, {
                    mobile: e.target.checked ? { anchor: slot?.desktop?.anchor || 'bottom-left' } : undefined,
                  })
                }
              />
              Custom position on phones (portrait &amp; landscape)
            </label>
            {phone ? (
              <SlotPlacementFields
                label={`${slotLabel} anchor on phones`}
                value={slot?.mobile}
                widthPlaceholder="100%"
                disabled={disabled}
                onChange={(mobile) => setSlot(name, { mobile })}
              />
            ) : null}
          </fieldset>
        );
      })}
      <p className="az-admin-hint">
        Pick an anchor, then fine-tune with X / Y (px, rem, % or vw; a plain number means px). On an edge the offset is the
        gap kept from that edge, so <strong>bottom left, X -10px, Y -20px</strong> keeps the container 10px from the left
        and 20px from the bottom. On a centre line it nudges instead: + moves right / down, − moves left / up. Click the
        active dot again for the natural layout.
        {anyDesktop ? ' Phones keep the natural stacked layout unless “Custom position on phones” is ticked.' : ''} On
        phones (portrait and landscape) containers always stay stacked (top, middle, bottom by anchor) so they never
        overlap and stay clear of the header. On every screen a container shrinks rather than run off the side.
      </p>
    </div>
  );
}
