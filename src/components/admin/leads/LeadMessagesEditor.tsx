'use client';

import type { ReactNode } from 'react';
import AdminFloatingActions from '@/components/admin/AdminFloatingActions';
import MediaPicker from '@/components/admin/MediaPicker';
import { CopyField, setPath } from '@/components/admin/site-copy/CopyField';
import { useSiteCopySlice } from '@/components/admin/site-copy/use-site-copy-slice';
import { LEAD_COPY_PATHS } from './lead-copy';

function Card({ id, title, description, children }: { id: string; title: string; description: ReactNode; children: ReactNode }) {
  return (
    <section className="admin-card" aria-labelledby={id}>
      <h3 id={id} style={{ marginTop: 0 }}>
        {title}
      </h3>
      <p className="theme-help" style={{ marginTop: 0 }}>
        {description}
      </p>
      <div className="admin-form-grid">{children}</div>
    </section>
  );
}

/** What visitors read around a submission: the enquiry pop-up and the /thank-you page (stored in Site Copy). */
export default function LeadMessagesEditor() {
  const { copy, setCopy, error, message, saving, save } = useSiteCopySlice(
    LEAD_COPY_PATHS,
    'Messages saved. Public pages pick them up on next load.'
  );

  return (
    <div className="admin-page-stack">
      <AdminFloatingActions status={message || (saving ? 'Saving…' : undefined)}>
        <button type="button" className="admin-btn admin-btn-primary" disabled={saving || !copy} onClick={() => void save()}>
          {saving ? 'Saving…' : 'Save messages'}
        </button>
      </AdminFloatingActions>

      {error ? <div className="admin-error">{error}</div> : null}
      {message ? <div className="admin-success">{message}</div> : null}

      {copy ? (
        <>
          <Card
            id="lead-messages-popup"
            title="Enquiry pop-up"
            description="The window opened by Send an Enquiry buttons. Its fields come from the Form fields tab."
          >
            <CopyField label="Badge" path="consultation.badge" copy={copy} onChange={setCopy} />
            <CopyField label="Title" path="consultation.title" copy={copy} onChange={setCopy} />
            <div className="full">
              <CopyField label="Lead (under title)" path="consultation.step2Lead" copy={copy} onChange={setCopy} multiline />
            </div>
            <CopyField label="Submit button" path="consultation.submitLabel" copy={copy} onChange={setCopy} />
            <CopyField label="Submit button while sending" path="consultation.submittingLabel" copy={copy} onChange={setCopy} />
            <CopyField label="Shown while the form loads" path="consultation.loadingForm" copy={copy} onChange={setCopy} />
            <CopyField label="Screen-reader name" path="consultation.ariaLabel" copy={copy} onChange={setCopy} />
            <div className="full">
              <CopyField label="Success message" path="consultation.successMsg" copy={copy} onChange={setCopy} multiline />
            </div>
          </Card>

          <Card
            id="lead-messages-thank-you"
            title="Thank-you page"
            description={
              <>
                Where visitors land after any form. The intro reads: start + ending + your response time (Site Settings →
                Address &amp; office). Use <code>{'{city}'}</code> in the city start.
              </>
            }
          >
            <CopyField label="Eyebrow" path="thankYou.eyebrow" copy={copy} onChange={setCopy} />
            <CopyField label="Title · enquiry" path="thankYou.titleEnquiry" copy={copy} onChange={setCopy} />
            <CopyField label="Title · callback" path="thankYou.titleCallback" copy={copy} onChange={setCopy} />
            <CopyField label="Title · brochure" path="thankYou.titleBrochure" copy={copy} onChange={setCopy} />
            <CopyField label="Title · job application" path="thankYou.titleCareers" copy={copy} onChange={setCopy} />
            <CopyField label="Intro start" path="thankYou.leadPrefix" copy={copy} onChange={setCopy} />
            <CopyField label="Intro start when a city is known" path="thankYou.leadCityPrefix" copy={copy} onChange={setCopy} />
            <div className="full">
              <CopyField label="Intro ending" path="thankYou.leadSuffix" copy={copy} onChange={setCopy} multiline />
            </div>
            <div className="full">
              <CopyField label="Proof rail (one per line)" path="thankYou.proofRail" copy={copy} onChange={setCopy} multiline />
            </div>
            <CopyField label="Next steps heading" path="thankYou.nextTitle" copy={copy} onChange={setCopy} />
            <CopyField label="Contact heading" path="thankYou.talkTitle" copy={copy} onChange={setCopy} />
            <div className="full">
              <CopyField label="Next steps (one per line)" path="thankYou.nextSteps" copy={copy} onChange={setCopy} multiline />
            </div>
            <div className="full">
              <CopyField label="WhatsApp pre-filled message" path="thankYou.whatsappPrefill" copy={copy} onChange={setCopy} />
            </div>
            <div className="full">
              <MediaPicker
                value={copy.thankYou.heroImage || ''}
                onChange={(path) => setCopy(setPath(copy, 'thankYou.heroImage', path))}
                label="Hero media (desktop)"
                kinds="visual"
                allowUpload
                hint="Background for every thank-you variant (enquiry, callback, brochure, job application)."
              />
            </div>
            <div className="full">
              <MediaPicker
                value={copy.thankYou.heroImageMobile || ''}
                onChange={(path) => setCopy(setPath(copy, 'thankYou.heroImageMobile', path))}
                label="Hero media (mobile, optional)"
                kinds="visual"
                allowUpload
                hint="Optional ≤760px override. Leave blank to reuse desktop."
              />
            </div>
          </Card>
        </>
      ) : !error ? (
        <div className="admin-card">Loading messages…</div>
      ) : null}
    </div>
  );
}
