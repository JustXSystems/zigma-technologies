import { getThemeSettings } from '@/lib/cms';
import { mergeSiteSettings } from '@/lib/site-settings';

export default async function OrganizationJsonLd() {
  const theme = await getThemeSettings();
  const site = mergeSiteSettings(theme.site);
  const base = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.zigma-technologies.com').replace(/\/$/, '');

  const logoUrl = site.logoUrl
    ? site.logoUrl.startsWith('http')
      ? site.logoUrl
      : `${base}${site.logoUrl}`
    : `${base}/assets/images/zigma-technologies-logo.png`;

  const sameAs = [site.facebookUrl, site.linkedinUrl].filter(Boolean);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': ['Organization', 'LocalBusiness'],
    '@id': `${base}/#organization`,
    name: site.companyName,
    alternateName: 'Zigma',
    description: site.defaultMetaDescription,
    url: base,
    logo: {
      '@type': 'ImageObject',
      url: logoUrl,
    },
    image: logoUrl,
    foundingDate: '2006',
    telephone: site.phone,
    email: site.email,
    address: {
      '@type': 'PostalAddress',
      ...(site.addressStreet ? { streetAddress: site.addressStreet } : {}),
      addressLocality: site.addressLocality || 'Bengaluru',
      addressRegion: site.addressRegion || 'Karnataka',
      ...(site.addressPostal ? { postalCode: site.addressPostal } : {}),
      addressCountry: site.addressCountry || 'IN',
    },
    contactPoint: [
      {
        '@type': 'ContactPoint',
        telephone: site.phone,
        contactType: 'customer service',
        areaServed: 'IN',
        availableLanguage: ['English', 'Hindi', 'Kannada'],
      },
      ...(site.emergencyPhone
        ? [
            {
              '@type': 'ContactPoint',
              telephone: site.emergencyPhone,
              contactType: 'technical support',
              contactOption: 'TollFree',
              hoursAvailable: {
                '@type': 'OpeningHoursSpecification',
                dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
              },
              areaServed: 'IN',
            },
          ]
        : []),
    ],
    areaServed: {
      '@type': 'Country',
      name: 'India',
    },
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

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
