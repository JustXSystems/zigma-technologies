'use client';

import AdminHub, { type AdminHubTab } from '@/components/admin/AdminHub';
import SiteSettingsEditor from '@/components/admin/site-settings/SiteSettingsEditor';
import { AdminLink } from '@/components/admin/unsaved-changes';
import FormFieldsEditor from './FormFieldsEditor';
import LeadMessagesEditor from './LeadMessagesEditor';

type Tab = 'fields' | 'messages' | 'crm';

const TABS: readonly AdminHubTab<Tab>[] = [
  {
    id: 'fields',
    label: 'Form fields',
    screen: 'forms',
    description:
      'The enquiry form behind the Send an Enquiry pop-up, the contact page, product / project enquiry drawers and case-study blocks. Changes apply on the public site immediately.',
  },
  {
    id: 'messages',
    label: 'Pop-up & thank-you',
    screen: 'siteCopy',
    description: 'What visitors read while sending an enquiry and on the page they land on afterwards.',
  },
  {
    id: 'crm',
    label: 'CRM',
    screen: 'siteSettings',
    description: 'Forward new leads to HubSpot, Zoho, Zapier, Make or any webhook as they arrive.',
  },
];

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
      tabs={TABS}
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
