import type { Metadata } from "next";
import { Space_Grotesk, Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-display-loaded",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: true,
});

const inter = Inter({
  variable: "--font-body-loaded",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-mono-loaded",
  subsets: ["latin"],
  weight: ["500", "600"],
  display: "swap",
});

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.zigma-technologies.com').replace(/\/$/, '');
const OG_IMAGE = `${SITE_URL}/assets/images/zigma-technologies-logo.png`;
const TITLE = 'Zigma Technologies | Solar EPC, UPS, BESS & EV Charging in India';
const DESCRIPTION =
  'Zigma Technologies delivers end-to-end Solar EPC, UPS & Power Continuity, BESS, EV Charging Infrastructure, and Industrial Engineering solutions across India. 20+ years of engineering excellence, installation, AMC and 24×7 support.';

export const metadata: Metadata = {
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="/api/public/theme.css" />
      </head>
      <body className={`${spaceGrotesk.variable} ${inter.variable} ${ibmPlexMono.variable}`}>
        {children}
      </body>
    </html>
  );
}
