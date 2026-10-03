'use client';

import type { SiteCopy } from '@/lib/site-copy';
import { CopyField } from '@/components/admin/site-copy/CopyField';

type Props = {
  copy: SiteCopy;
  onChange: (next: SiteCopy) => void;
  /** Marketing wording is only shown to visitors when the marketing switch is offered. */
  marketingEnabled: boolean;
};

/** Text of the cookie banner and the /cookies policy page. */
export default function CookieCopyFields({ copy, onChange, marketingEnabled }: Props) {
  const field = (label: string, key: keyof SiteCopy['cookies'], multiline = false) => (
    <div className={multiline ? 'full' : undefined}>
      <CopyField label={label} path={`cookies.${key}`} copy={copy} onChange={onChange} multiline={multiline} />
    </div>
  );

  return (
    <div className="admin-page-stack" style={{ marginTop: '1.25rem' }}>
      <section aria-labelledby="cookie-copy-banner">
        <h4 id="cookie-copy-banner" style={{ margin: '0 0 0.35rem' }}>
          Cookie banner
        </h4>
        <p className="theme-help" style={{ marginTop: 0 }}>
          Shown until the visitor chooses, when consent is required and an analytics ID is set. Links to the Cookie and
          Privacy Policy URLs under Footer &amp; legal.
        </p>
        <div className="admin-form-grid">
          {field('Message', 'bannerBody', true)}
          {field('Necessary switch', 'necessaryLabel')}
          {field('Analytics switch', 'analyticsLabel')}
          {marketingEnabled ? field('Marketing switch', 'marketingLabel') : null}
          {field('Save button', 'saveChoices')}
          {field('Decline button', 'declineOptional')}
        </div>
      </section>
      <section aria-labelledby="cookie-copy-page">
        <h4 id="cookie-copy-page" style={{ margin: '0 0 0.35rem' }}>
          Cookie Policy page (/cookies)
        </h4>
        <div className="admin-form-grid">
          {field('Eyebrow', 'pageEyebrow')}
          {field('Title', 'pageTitle')}
          {field('Lead', 'pageLead', true)}
          {field('Necessary heading', 'necessaryHeading')}
          {field('Necessary text', 'necessaryBody', true)}
          {field('Analytics heading', 'analyticsHeading')}
          {field('Analytics text', 'analyticsBody', true)}
          {field('Marketing heading', 'marketingHeading')}
          {field('Marketing text', 'marketingBody', true)}
          {field('Closing line (before the Privacy Policy link)', 'manageHint', true)}
        </div>
      </section>
    </div>
  );
}
