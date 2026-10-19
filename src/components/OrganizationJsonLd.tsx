import JsonLd from '@/components/JsonLd';
import { getThemeSettings } from '@/lib/cms';
import { absoluteUrl, organizationId, siteOrigin, websiteId } from '@/lib/seo';
import { formatStreetAddress, mergeSiteSettings, socialLinksFromSettings } from '@/lib/site-settings';

/** Parse "Mon–Sat 9:30–18:30 IST" style office hours into schema.org OpeningHoursSpecification. */
function openingHoursFromOfficeHours(raw: string | undefined) {
  const text = String(raw || '').trim();
  if (!text) return undefined;
  const time = text.match(/(\d{1,2}):(\d{2})\s*[–-]\s*(\d{1,2}):(\d{2})/);
  if (!time) return undefined;
  const opens = `${time[1].padStart(2, '0')}:${time[2]}`;
  const closes = `${time[3].padStart(2, '0')}:${time[4]}`;
  const monSat = /mon\s*[–-]\s*sat/i.test(text);
  const dayOfWeek = monSat
    ? ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  return {
    '@type': 'OpeningHoursSpecification',
    dayOfWeek,
    opens,
    closes,
  };
}

export default async function OrganizationJsonLd() {
  const theme = await getThemeSettings().catch(() => ({}) as Awaited<ReturnType<typeof getThemeSettings>>);
  const site = mergeSiteSettings(theme?.site);
  const base = siteOrigin();

  const logoUrl = absoluteUrl(site.logoUrl || '/assets/images/zigma-technologies-logo.png');
  const sameAs = socialLinksFromSettings(site).map((link) => link.href);
  const streetAddress = formatStreetAddress(site);
  const openingHoursSpecification = openingHoursFromOfficeHours(site.officeHours);

  const organization = {
    '@type': ['Organization', 'LocalBusiness'],
    '@id': organizationId(),
    name: site.companyName,
    alternateName: 'Zigma',
    description: site.defaultMetaDescription,
    url: `${base}/`,
    logo: { '@type': 'ImageObject', url: logoUrl },
    image: logoUrl,
    foundingDate: '2006',
    ...(site.phone ? { telephone: site.phone } : {}),
    ...(site.email ? { email: site.email } : {}),
    address: {
      '@type': 'PostalAddress',
      ...(streetAddress ? { streetAddress } : {}),
      addressLocality: site.addressLocality || 'Bengaluru',
      addressRegion: site.addressRegion || 'Karnataka',
      ...(site.addressPostal?.trim() ? { postalCode: site.addressPostal.trim() } : {}),
      addressCountry: site.addressCountry || 'IN',
    },
    ...(openingHoursSpecification ? { openingHoursSpecification } : {}),
    contactPoint: [
      ...(site.phone
        ? [
            {
              '@type': 'ContactPoint',
              telephone: site.phone,
              contactType: 'customer service',
              areaServed: 'IN',
              availableLanguage: ['English', 'Hindi', 'Kannada'],
            },
          ]
        : []),
      ...(site.emergencyPhone
        ? [
            {
              '@type': 'ContactPoint',
              telephone: site.emergencyPhone,
              contactType: 'technical support',
              hoursAvailable: {
                '@type': 'OpeningHoursSpecification',
                dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
                opens: '00:00',
                closes: '23:59',
              },
              areaServed: 'IN',
            },
          ]
        : []),
    ],
    areaServed: { '@type': 'Country', name: 'India' },
    knowsAbout: [
      'Solar EPC',
      'UPS Systems',
      'Battery Energy Storage Systems',
      'EV Charging Infrastructure',
      'Annual Maintenance Contract',
      'Power Engineering',
    ],
    ...(sameAs.length ? { sameAs } : {}),
  };

  const website = {
    '@type': 'WebSite',
    '@id': websiteId(),
    url: `${base}/`,
    name: site.companyName,
    inLanguage: 'en-IN',
    publisher: { '@id': organizationId() },
  };

  return <JsonLd data={{ '@context': 'https://schema.org', '@graph': [organization, website] }} />;
}
