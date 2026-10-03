import { CATALOG_COPY_PATHS } from '@/components/admin/catalog/catalog-copy';
import { CHROME_LABEL_PATHS } from '@/components/admin/header-footer/chrome-labels';
import { LEAD_COPY_PATHS } from '@/components/admin/leads/lead-copy';

/** Per-path titles and descriptions for built-in pages, edited in SEO → Page titles. */
export const SEO_COPY_PATHS = ['seo'] as const;

/** Cookie banner and /cookies page text, edited in Site Settings → Analytics & cookies. */
export const COOKIE_COPY_PATHS = ['cookies'] as const;

/** Site Copy paths edited on other screens; Site Copy saves keep their latest stored values. */
export const COPY_PATHS_EDITED_ELSEWHERE: readonly string[] = [
  ...CHROME_LABEL_PATHS,
  ...SEO_COPY_PATHS,
  ...COOKIE_COPY_PATHS,
  ...LEAD_COPY_PATHS,
  ...CATALOG_COPY_PATHS,
];
