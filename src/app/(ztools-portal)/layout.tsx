import SiteProviders from '@/components/SiteProviders';
import { loadSiteShell } from '@/lib/site-shell';

/** ZTools portal — no public site header/footer. */
export default async function ZtoolsPortalLayout({ children }: { children: React.ReactNode }) {
  const shell = await loadSiteShell();

  return (
    <SiteProviders
      settings={shell.settings}
      copy={shell.copy}
      headerNav={shell.headerNav}
      footerColumns={shell.footerColumns}
    >
      {children}
    </SiteProviders>
  );
}
