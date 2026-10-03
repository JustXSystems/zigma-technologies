'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SiteSettingsEditor, { siteSettingsHashHome } from '@/components/admin/site-settings/SiteSettingsEditor';
import { AdminLink } from '@/components/admin/unsaved-changes';

export default function SiteSettingsPage() {
  const router = useRouter();

  useEffect(() => {
    const home = siteSettingsHashHome(window.location.hash);
    if (home) router.replace(home);
  }, [router]);

  return (
    <SiteSettingsEditor
      group="general"
      intro={{
        title: 'Site settings',
        body: (
          <>
            Brand, contact details, address and analytics. Header and footer options are in{' '}
            <AdminLink href="/admin/header-footer">Header &amp; Footer</AdminLink>; default meta description and share
            image in <AdminLink href="/admin/seo">SEO</AdminLink>; the CRM webhook in{' '}
            <AdminLink href="/admin/forms?tab=crm">Forms &amp; CRM</AdminLink>; heading levels and eyebrow sizes in{' '}
            <AdminLink href="/admin/theme?tab=typography">Theme Studio → Typography</AdminLink>. All sections start
            collapsed — expand one to edit.
          </>
        ),
      }}
    />
  );
}
