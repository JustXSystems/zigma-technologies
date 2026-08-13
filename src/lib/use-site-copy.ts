'use client';

import { useSiteShell } from '@/components/SiteProviders';
import { DEFAULT_SITE_COPY, type SiteCopy } from '@/lib/site-copy';

export function useSiteCopy(): SiteCopy {
  return useSiteShell().copy;
}
