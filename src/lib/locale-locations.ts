export type SiteLocale = 'hi' | 'kn';

type LocaleCityCopy = { title: string; lead: string };

/**
 * Translated city pages. A `/hi/locations/<city>` or `/kn/locations/<city>` page is
 * indexable (and advertised via hreflang / sitemap) only when it has an entry here.
 */
export const LOCALE_CITY_COPY: Record<SiteLocale, Record<string, LocaleCityCopy>> = {
  hi: {
    bengaluru: {
      title: 'बेंगलुरु में पावर और एनर्जी इंजीनियरिंग',
      lead: 'बेंगलुरु उद्योगों, कैंपस और अस्पतालों के लिए सोलर EPC, UPS, BESS और 24×7 AMC।',
    },
  },
  kn: {
    bengaluru: {
      title: 'ಬೆಂಗಳೂರಿನಲ್ಲಿ ಪವರ್ ಮತ್ತು ಎನರ್ಜಿ ಎಂಜಿನಿಯರಿಂಗ್',
      lead: 'ಬೆಂಗಳೂರು ಕೈಗಾರಿಕೆ, ಕ್ಯಾಂಪಸ್ ಮತ್ತು ಆಸ್ಪತ್ರೆಗಳಿಗೆ ಸೋಲಾರ್ EPC, UPS, BESS ಮತ್ತು 24×7 AMC.',
    },
  },
};

export const LOCALE_OG: Record<SiteLocale, string> = { hi: 'hi_IN', kn: 'kn_IN' };

export function localeCityCopy(locale: SiteLocale, city: string): LocaleCityCopy | null {
  return LOCALE_CITY_COPY[locale][city] || null;
}

/** hreflang paths for a city — only translated versions are listed. */
export function cityLocalePaths(city: string, localesEnabled: boolean) {
  return {
    en: `/locations/${city}`,
    hi: localesEnabled && localeCityCopy('hi', city) ? `/hi/locations/${city}` : null,
    kn: localesEnabled && localeCityCopy('kn', city) ? `/kn/locations/${city}` : null,
  };
}

export function translatedCityKeys(locale: SiteLocale): string[] {
  return Object.keys(LOCALE_CITY_COPY[locale]);
}
