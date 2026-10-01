'use client';

import { Field, TextInput, Toggle } from '@/components/admin/about/AboutControls';
import { heroScrollBarOn } from '@/lib/hero-height';

export type HeroScrollBar = { hidden?: boolean; gradient?: string };

type Props = {
  /** Omit both to leave the entrance toggle to the editor (heroes that already have one). */
  entrance?: boolean;
  onEntrance?: (entrance: boolean) => void;
  scrollBar: HeroScrollBar | undefined;
  onScrollBar: (scrollBar: HeroScrollBar) => void;
};

/** Hero "motion" controls shared by every page hero, matching the Legacy hero: fade-up entrance + scroll progress bar. */
export default function HeroMotionFields({ entrance, onEntrance, scrollBar, onScrollBar }: Props) {
  const scroll = scrollBar || {};
  return (
    <div className="admin-form-grid">
      <Field label="Behaviour">
        {onEntrance ? <Toggle label="Fade-up entrance animation" checked={Boolean(entrance)} onChange={onEntrance} /> : null}
        <Toggle
          label="Scroll progress bar at the top of the page"
          checked={heroScrollBarOn(scrollBar)}
          onChange={(v) => onScrollBar({ ...scroll, hidden: !v })}
        />
      </Field>
      <TextInput
        label="Scroll bar color / gradient"
        value={scroll.gradient}
        onChange={(gradient) => onScrollBar({ ...scroll, hidden: scroll.hidden ?? true, gradient })}
        placeholder="linear-gradient(90deg,var(--orange),var(--yellow))"
      />
    </div>
  );
}
