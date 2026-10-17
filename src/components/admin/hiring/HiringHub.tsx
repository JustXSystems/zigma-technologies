'use client';

import AdminHub from '@/components/admin/AdminHub';
import { AdminLink } from '@/components/admin/unsaved-changes';
import { HIRING_TABS } from '@/lib/admin-hub-tabs';
import HiringWorkspace from './HiringWorkspace';
import './Hiring.css';

export default function HiringHub({ initialTab, initialJob }: { initialTab?: string; initialJob?: string }) {
  return (
    <AdminHub
      title="Hiring"
      intro={
        <>
          Manage time-bound job openings for{' '}
          <AdminLink href="/careers" target="_blank">
            /careers
          </AdminLink>
          , move applicants through the pipeline, and keep a closed-job archive for audit. Website applications appear in Pipeline
          automatically. Section chrome (headings, colours) stays on the Careers page under Pages.
        </>
      }
      tabs={HIRING_TABS}
      initialTab={initialTab}
    >
      {(active) => <HiringWorkspace tab={active} initialJobId={initialJob} />}
    </AdminHub>
  );
}
