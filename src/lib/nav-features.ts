import type { FooterColumn } from '@/lib/nav-tree';
import type { SiteCopy } from '@/lib/site-copy';
import type { NavItem } from '@/lib/nav-types';

export type PublicNavFeatures = Pick<
  SiteCopy['features'],
  'resourcesEnabled' | 'industriesEnabled'
>;

function pathOnly(href?: string) {
  return href?.split('#')[0].split('?')[0] || '';
}

function isResourcesHref(href?: string) {
  const path = pathOnly(href);
  return path === '/resources' || path.startsWith('/resources/');
}

function isIndustriesHref(href?: string) {
  const path = pathOnly(href);
  return path === '/industries' || path.startsWith('/industries/');
}

function shouldHideHref(href: string | undefined, features: PublicNavFeatures) {
  if (!href) return false;
  if (!features.resourcesEnabled && isResourcesHref(href)) return true;
  if (!features.industriesEnabled && isIndustriesHref(href)) return true;
  return false;
}

/** Strip disabled-feature links from CMS or default nav. */
export function filterNavForFeatures(items: NavItem[], features: PublicNavFeatures): NavItem[] {
  return items
    .filter((item) => !shouldHideHref(item.href, features))
    .map((item) => {
      if (!item.mega?.length) return item;
      const mega = item.mega
        .map((col) => ({
          ...col,
          links: col.links.filter((link) => !shouldHideHref(link.href, features)),
        }))
        .filter((col) => col.links.length > 0 && !shouldHideHref(col.headingHref, features));
      return { ...item, mega };
    })
    .filter((item) => !item.mega || item.mega.length > 0);
}

export function filterFooterColumnsForFeatures(
  columns: FooterColumn[],
  features: PublicNavFeatures
): FooterColumn[] {
  return columns.map((col) => ({
    ...col,
    links: col.links.filter((link) => !shouldHideHref(link.href, features)),
  }));
}
