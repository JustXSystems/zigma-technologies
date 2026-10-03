'use client';

import type { SiteCopy } from '@/lib/site-copy';
import type { CatalogItemType } from '@/lib/types';
import { CopyField } from '@/components/admin/site-copy/CopyField';
import { catalogCopyKey } from './catalog-copy';

/** Headings of the “Trusted partners strip”: one for this catalog page, plus the shared defaults. */
export default function CatalogPartnerStripFields({
  type,
  copy,
  onChange,
}: {
  type: CatalogItemType;
  copy: SiteCopy;
  onChange: (next: SiteCopy) => void;
}) {
  return (
    <div className="admin-form-grid">
      <div className="full">
        <CopyField
          label={`Title on /${type}s`}
          path={`catalog.${catalogCopyKey(type)}.socialProofTitle`}
          copy={copy}
          onChange={onChange}
          placeholder={copy.socialProof.title}
        />
      </div>
      <CopyField label="Default title (all catalog pages)" path="socialProof.title" copy={copy} onChange={onChange} />
      <CopyField label="Subtitle (all catalog pages)" path="socialProof.subtitle" copy={copy} onChange={onChange} />
    </div>
  );
}
