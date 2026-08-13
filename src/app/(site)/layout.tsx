import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SiteSeo from "@/components/SiteSeo";
import OrganizationJsonLd from "@/components/OrganizationJsonLd";
import ConsultationModalHost from '@/components/ConsultationModalHost';
import CookieConsent from "@/components/CookieConsent";
import PwaRegister from "@/components/PwaRegister";
import { getThemeSettings } from "@/lib/cms";
import { mergeSiteSettings } from "@/lib/site-settings";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const theme = await getThemeSettings();
  const settings = mergeSiteSettings(theme.site);

  return (
    <>
      <OrganizationJsonLd />
      <SiteSeo />
      <Header />
      <ConsultationModalHost />
      {children}
      <Footer />
      <CookieConsent settings={settings} />
      <PwaRegister />
    </>
  );
}
