'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';

/**
 * Slide-over panel for create / edit flows. Escape and the backdrop call `onClose`, so the
 * caller decides whether unsaved edits need a confirmation.
 */
export default function AdminDrawer({
  open,
  title,
  subtitle,
  onClose,
  footer,
  children,
}: {
  open: boolean;
  title: ReactNode;
  subtitle?: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
  children: ReactNode;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const first = panelRef.current?.querySelector<HTMLElement>('.admin-drawer-body input:not([disabled]), .admin-drawer-body select:not([disabled]), .admin-drawer-body textarea');
    (first ?? panelRef.current)?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        closeRef.current();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.({ preventScroll: true });
    };
  }, [open]);

  if (!open) return null;
  return (
    <div className="admin-drawer-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={panelRef} className="admin-drawer" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        <div className="admin-drawer-header">
          <div>
            <h2 id={titleId}>{title}</h2>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          <button type="button" className="admin-modal-close" aria-label="Close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="admin-drawer-body">{children}</div>
        {footer ? <div className="admin-drawer-footer">{footer}</div> : null}
      </div>
    </div>
  );
}
