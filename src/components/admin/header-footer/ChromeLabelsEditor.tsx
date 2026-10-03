'use client';

import AdminFloatingActions from '@/components/admin/AdminFloatingActions';
import { CopyField } from '@/components/admin/site-copy/CopyField';
import { useSiteCopySlice } from '@/components/admin/site-copy/use-site-copy-slice';
import { CHROME_LABEL_GROUPS, CHROME_LABEL_PATHS } from './chrome-labels';

/** Header, footer and sticky-bar text (stored in Site Copy). */
export default function ChromeLabelsEditor() {
  const { copy, setCopy, error, message, saving, save } = useSiteCopySlice(
    CHROME_LABEL_PATHS,
    'Labels saved. Public pages pick them up on next load.'
  );

  return (
    <div className="admin-page-stack">
      <AdminFloatingActions status={message || (saving ? 'Saving…' : undefined)}>
        <button type="button" className="admin-btn admin-btn-primary" disabled={saving || !copy} onClick={() => void save()}>
          {saving ? 'Saving…' : 'Save labels'}
        </button>
      </AdminFloatingActions>

      {error ? <div className="admin-error">{error}</div> : null}
      {message ? <div className="admin-success">{message}</div> : null}

      {copy
        ? CHROME_LABEL_GROUPS.map((group) => (
            <section key={group.id} className="admin-card" aria-labelledby={`labels-${group.id}`}>
              <h3 id={`labels-${group.id}`} style={{ marginTop: 0 }}>
                {group.title}
              </h3>
              <p className="theme-help" style={{ marginTop: 0 }}>
                {group.description}
              </p>
              <div className="admin-form-grid">
                {group.fields.map((field) =>
                  field.multiline ? (
                    <div key={field.path} className="full">
                      <CopyField label={field.label} path={field.path} copy={copy} onChange={setCopy} multiline />
                    </div>
                  ) : (
                    <CopyField key={field.path} label={field.label} path={field.path} copy={copy} onChange={setCopy} />
                  )
                )}
              </div>
            </section>
          ))
        : !error ? <div className="admin-card">Loading labels…</div> : null}
    </div>
  );
}
