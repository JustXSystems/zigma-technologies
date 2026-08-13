import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SiteSeo from '@/components/SiteSeo';
import OrganizationJsonLd from '@/components/OrganizationJsonLd';
import CookieConsent from '@/components/CookieConsent';
import SiteProviders from '@/components/SiteProviders';
import { loadSiteShell } from '@/lib/site-shell';
import {
  ConsultationModalHost,
  PwaRegister,
  ThemePreviewBridge,
} from '@/components/SiteLazyClient';

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const shell = await loadSiteShell();

  return (
    <SiteProviders
      settings={shell.settings}
      copy={shell.copy}
      headerNav={shell.headerNav}
      footerColumns={shell.footerColumns}
    >
      <ThemePreviewBridge />
      <OrganizationJsonLd />
      <SiteSeo />
      <Header />
      <ConsultationModalHost />
      {children}
      <Footer />
      <CookieConsent settings={shell.settings} />
      <PwaRegister />
    </SiteProviders>
  );
}
