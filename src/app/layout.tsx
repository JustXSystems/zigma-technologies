import type { Metadata } from "next";
import "./globals.css";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.zigma-technologies.com').replace(/\/$/, '');
const OG_IMAGE = `${SITE_URL}/assets/images/zigma-technologies-logo.png`;
const TITLE = 'Zigma Technologies | Solar EPC, UPS, BESS & EV Charging in India';
const DESCRIPTION =
  'Zigma Technologies delivers end-to-end Solar EPC, UPS & Power Continuity, BESS, EV Charging Infrastructure, and Industrial Engineering solutions across India. 20+ years of engineering excellence, installation, AMC and 24×7 support.';

export async function generateMetadata(): Promise<Metadata> {
  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: TITLE,
      template: '%s | Zigma Technologies',
    },
    description: DESCRIPTION,
    manifest: '/manifest.webmanifest',
    appleWebApp: {
      capable: true,
      title: 'Zigma',
      statusBarStyle: 'black-translucent',
    },
    keywords: [
      'Solar EPC India',
      'UPS solutions Bangalore',
      'Battery Energy Storage BESS',
      'EV Charging Infrastructure',
      'Industrial UPS AMC',
      'Solar power plant',
      'Power engineering company India',
      'Annual maintenance contract power',
      'Zigma Technologies',
    ],
    authors: [{ name: 'Zigma Technologies', url: SITE_URL }],
    creator: 'Zigma Technologies',
    publisher: 'Zigma Technologies',
    openGraph: {
      type: 'website',
      locale: 'en_IN',
      url: SITE_URL,
      siteName: 'Zigma Technologies',
      title: TITLE,
      description: DESCRIPTION,
      images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: 'Zigma Technologies — Power & Energy Engineering' }],
    },
    twitter: {
      card: 'summary_large_image',
      site: '@zigmatech',
      title: TITLE,
      description: DESCRIPTION,
      images: [OG_IMAGE],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, 'max-snippet': -1, 'max-image-preview': 'large' },
    },
    alternates: { canonical: SITE_URL },
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap"
          rel="stylesheet"
        />
        <link rel="stylesheet" href="/api/public/theme.css" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
