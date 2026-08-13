import { getThemeSettings, upsertThemeSetting } from '@/lib/cms';
import { DEFAULT_SITE_COPY, mergeSiteCopy, type SiteCopy } from '@/lib/site-copy';
import { INDUSTRY_DEFS, mergeIndustryDefs, type IndustryDef } from '@/lib/industries';
import { LOCATION_DEFS, mergeLocationDefs, type LocationDef } from '@/lib/locations';

export async function getSiteCopy(): Promise<SiteCopy> {
  try {
    const theme = await getThemeSettings();
    return mergeSiteCopy(theme.site_copy);
  } catch {
    return DEFAULT_SITE_COPY;
  }
}

export async function saveSiteCopy(copy: SiteCopy) {
  await upsertThemeSetting('site_copy', copy);
}

export async function getIndustryDefsCms(): Promise<IndustryDef[]> {
  try {
    const theme = await getThemeSettings();
    return mergeIndustryDefs(theme.industries);
  } catch {
    return INDUSTRY_DEFS;
  }
}

export async function getLocationDefsCms(): Promise<LocationDef[]> {
  try {
    const theme = await getThemeSettings();
    return mergeLocationDefs(theme.locations);
  } catch {
    return LOCATION_DEFS;
  }
}

export async function saveIndustryDefs(defs: IndustryDef[]) {
  await upsertThemeSetting('industries', defs);
}

export async function saveLocationDefs(defs: LocationDef[]) {
  await upsertThemeSetting('locations', defs);
}
