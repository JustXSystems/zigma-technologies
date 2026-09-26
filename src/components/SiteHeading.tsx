'use client';

import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';
import { useSiteShell } from '@/components/SiteProviders';
import {
  headingTagForRole,
  type HeadingLevelId,
  type HeadingRole,
} from '@/lib/site-settings';

type Props = {
  /** pageHero = slides / page heroes; section = section titles & CTAs */
  role: HeadingRole;
  children: ReactNode;
  className?: string;
  id?: string;
  style?: ComponentPropsWithoutRef<'h3'>['style'];
  /** Override resolved tag (tests / previews). */
  as?: HeadingLevelId;
  /** pageHero only: render as <h2> with the hero size (e.g. carousel slides after the first). */
  secondary?: boolean;
};

/**
 * Renders headings from Site Settings → Typography heading levels.
 * `pageHero` is always an <h1> (one per page, for SEO / accessibility); the configured
 * level only sets its visual size via `heading-size-h*`. `section` headings use the
 * configured tag directly.
 */
export default function SiteHeading({ role, children, className, id, style, as, secondary }: Props) {
  const { settings } = useSiteShell();
  const level = as ?? headingTagForRole(settings, role);
  if (role === 'pageHero') {
    const HeroTag = secondary ? 'h2' : 'h1';
    const sizeClass = level === HeroTag ? '' : `heading-size-${level}`;
    return (
      <HeroTag className={[sizeClass, className].filter(Boolean).join(' ') || undefined} id={id} style={style}>
        {children}
      </HeroTag>
    );
  }
  const Tag = level as ElementType;
  return (
    <Tag className={className} id={id} style={style}>
      {children}
    </Tag>
  );
}
