'use client';

import type { ReactNode } from 'react';
import { useUnsavedChangesState } from '@/components/admin/unsaved-changes';

type Props = {
  children: ReactNode;
  /** Status text shown left of actions; replaced by “Unsaved changes” while the screen has unsaved edits. */
  status?: ReactNode;
  className?: string;
};

/**
 * Sticky/fixed floating action cluster — docked bottom-right so Save / Publish
 * stay reachable on long forms (site settings, catalog, theme, etc.).
 */
export default function AdminFloatingActions({ children, status, className = '' }: Props) {
  const { dirty } = useUnsavedChangesState();
  const shown = dirty ? 'Unsaved changes' : status;
  return (
    <div className={`admin-floating-actions${className ? ` ${className}` : ''}`} role="region" aria-label="Page actions">
      {shown ? (
        <div className="admin-floating-actions-status" data-dirty={dirty || undefined} role="status">
          {shown}
        </div>
      ) : null}
      <div className="admin-floating-actions-btns">{children}</div>
    </div>
  );
}
