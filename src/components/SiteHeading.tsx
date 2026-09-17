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
};

/**
 * Renders h1|h2|h3 from Site Settings → Typography heading levels.
 * Default for both roles is h3 (compact). Changing the setting updates
 * both the HTML tag and the matching --text-h* size.
 */
export default function SiteHeading({ role, children, className, id, style, as }: Props) {
  const { settings } = useSiteShell();
  const tag = as ?? headingTagForRole(settings, role);
  const Tag = tag as ElementType;
  return (
    <Tag className={className} id={id} style={style}>
      {children}
    </Tag>
  );
}
