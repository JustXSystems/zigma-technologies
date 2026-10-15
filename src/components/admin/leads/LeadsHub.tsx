'use client';

import AdminHub from '@/components/admin/AdminHub';
import { LEADS_TABS } from '@/lib/admin-hub-tabs';
import SiteSettingsEditor from '@/components/admin/site-settings/SiteSettingsEditor';
import { AdminLink } from '@/components/admin/unsaved-changes';
import FormFieldsEditor from './FormFieldsEditor';
import LeadMessagesEditor from './LeadMessagesEditor';

export default function LeadsHub({ initialTab }: { initialTab?: string }) {
  return (
    <AdminHub
      title="Forms & CRM"
      intro={
        <>
          How the site collects leads and where they go. Submissions themselves are in{' '}
          <AdminLink href="/admin/enquiries">Enquiries</AdminLink>; notification and auto-reply emails in{' '}
          <AdminLink href="/admin/email">Email</AdminLink>.
        </>
      }
      tabs={LEADS_TABS}
      initialTab={initialTab}
    >
      {(active) =>
        active === 'fields' ? (
          <FormFieldsEditor />
        ) : active === 'messages' ? (
          <LeadMessagesEditor />
        ) : (
          <SiteSettingsEditor group="leads" />
        )
      }
    </AdminHub>
  );
}
