import type { Metadata, Viewport } from "next";
import BasePathBootstrap from "@/components/BasePathBootstrap";
import { basePathFetchPatchScript, withBasePath } from "@/lib/base-path";
import { DEFAULT_OG_IMAGE, SITE_NAME, isIndexable, siteOrigin } from "@/lib/seo";
import "./globals.css";

const TITLE = 'Zigma Technologies | Solar EPC, UPS, BESS & EV Charging in India';
const DESCRIPTION =
  'Zigma Technologies delivers end-to-end Solar EPC, UPS & Power Continuity, BESS, EV Charging Infrastructure, and Industrial Engineering solutions across India. 20+ years of engineering excellence, installation, AMC and 24×7 support.';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export async function generateMetadata(): Promise<Metadata> {
  const googleVerification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim();
  const bingVerification = process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION?.trim();
  // No `alternates.canonical` here: metadata merges shallowly, so a root canonical
  // would mark every page without its own as a duplicate of the homepage.
  return {
    metadataBase: new URL(siteOrigin()),
    title: {
      default: TITLE,
      template: `%s | ${SITE_NAME}`,
    },
    description: DESCRIPTION,
    applicationName: SITE_NAME,
    manifest: '/manifest.webmanifest',
    appleWebApp: {
      capable: true,
      title: 'Zigma',
      statusBarStyle: 'black-translucent',
    },
    authors: [{ name: SITE_NAME, url: siteOrigin() }],
    creator: SITE_NAME,
    publisher: SITE_NAME,
    openGraph: {
      type: 'website',
      locale: 'en_IN',
      siteName: SITE_NAME,
      title: TITLE,
      description: DESCRIPTION,
      images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: 'Zigma Technologies — Power & Energy Engineering' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: TITLE,
      description: DESCRIPTION,
      images: [DEFAULT_OG_IMAGE],
    },
    robots: isIndexable()
      ? {
          index: true,
          follow: true,
          googleBot: { index: true, follow: true, 'max-snippet': -1, 'max-image-preview': 'large' },
        }
      : { index: false, follow: true },
    ...(googleVerification || bingVerification
      ? {
          verification: {
            ...(googleVerification ? { google: googleVerification } : {}),
            ...(bingVerification ? { other: { 'msvalidate.01': bingVerification } } : {}),
          },
        }
      : {}),
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const fetchPatch = basePathFetchPatchScript();
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <head>
        {fetchPatch ? (
          <script
            // Synchronously patch fetch before any client useEffect admin API calls.
            dangerouslySetInnerHTML={{ __html: fetchPatch }}
          />
        ) : null}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap"
          rel="stylesheet"
        />
        <link rel="stylesheet" href={withBasePath('/api/public/theme.css')} />
      </head>
      <body>
        <BasePathBootstrap />
        {children}
      </body>
    </html>
  );
}
