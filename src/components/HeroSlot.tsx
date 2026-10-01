import type { ReactNode } from 'react';
import type { HeroPlacementResult, HeroSlotName } from '@/lib/hero-placement';

/** Wraps a hero container so it can be anchored; renders children untouched when the hero has no placement. */
export default function HeroSlot({
  place,
  name,
  children,
}: {
  place: HeroPlacementResult;
  name: HeroSlotName;
  children: ReactNode;
}) {
  if (!children) return null;
  const props = place.slot(name);
  return props ? <div {...props}>{children}</div> : <>{children}</>;
}
