'use client';

import AdminHub from '@/components/admin/AdminHub';
import { AdminLink } from '@/components/admin/unsaved-changes';
import { HIRING_TABS } from '@/lib/admin-hub-tabs';
import HiringWorkspace from './HiringWorkspace';
import './Hiring.css';

export default function HiringHub({
  initialTab,
  initialJob,
  initialCandidate,
}: {
  initialTab?: string;
  initialJob?: string;
  initialCandidate?: string;
}) {
  return (
    <AdminHub
      title="Hiring"
      intro={
        <>
          Publish roles here (or from Pages → Careers → Current openings) — they go live on{' '}
          <AdminLink href="/careers" target="_blank">
            /careers
          </AdminLink>
          . Website applications sync into Pipeline automatically (matched role or General Applications queue). Stage moves update Enquiries status.
        </>
      }
      tabs={HIRING_TABS}
      initialTab={initialTab}
    >
      {(active) => (
        <HiringWorkspace tab={active} initialJobId={initialJob} initialCandidateId={initialCandidate} />
      )}
    </AdminHub>
  );
}
