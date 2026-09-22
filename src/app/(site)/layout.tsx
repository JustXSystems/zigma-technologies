import Header from '@/components/Header';
import Footer from '@/components/Footer';
import FooterLinkColumns from '@/components/FooterLinkColumns';
import SiteSeo from '@/components/SiteSeo';
import OrganizationJsonLd from '@/components/OrganizationJsonLd';
import CookieConsent from '@/components/CookieConsent';
import SiteProviders from '@/components/SiteProviders';
import { loadSiteShell } from '@/lib/site-shell';
import { logoSizingCss } from '@/lib/site-settings';
import {
  ConsultationModalHost,
  PwaRegister,
  ThemePreviewBridge,
} from '@/components/SiteLazyClient';

/** CMS-backed chrome — always request-time (CI has no MySQL for SSG). */
export const dynamic = 'force-dynamic';

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const shell = await loadSiteShell();

  return (
    <SiteProviders
      settings={shell.settings}
      copy={shell.copy}
      headerNav={shell.headerNav}
      footerColumns={shell.footerColumns}
    >
      <style dangerouslySetInnerHTML={{ __html: logoSizingCss(shell.settings) }} />
      <ThemePreviewBridge />
      <OrganizationJsonLd />
      <SiteSeo />
      <Header />
      <ConsultationModalHost />
      {children}
      <Footer
        footerNav={<FooterLinkColumns columns={shell.footerColumns} copy={shell.copy} />}
      />
      <CookieConsent settings={shell.settings} />
      <PwaRegister />
    </SiteProviders>
  );
}
