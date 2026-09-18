'use client';

import { useSiteShell } from '@/components/SiteProviders';
import type { SiteCopy } from '@/lib/site-copy';

export function useSiteCopy(): SiteCopy {
  return useSiteShell().copy;
}
