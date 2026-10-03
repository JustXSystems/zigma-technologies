'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';

/** Small confirmation dialog for destructive actions (replaces `window.confirm`). */
export default function ConfirmDialog({
  title,
  children,
  confirmLabel,
  busy,
  disabled,
  error,
  onConfirm,
  onCancel,
}: {
  title: string;
  children: ReactNode;
  confirmLabel: string;
  busy?: boolean;
  disabled?: boolean;
  error?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const titleId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const cancel = useRef(onCancel);
  useEffect(() => {
    cancel.current = onCancel;
  }, [onCancel]);

  useEffect(() => {
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && cancel.current();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="admin-modal-backdrop access-confirm-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="admin-modal access-confirm" role="alertdialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="admin-modal-header">
          <div className="admin-modal-header-text">
            <h2 id={titleId}>{title}</h2>
          </div>
        </div>
        <div className="admin-modal-body">
          {children}
          {error ? <div className="admin-error">{error}</div> : null}
        </div>
        <div className="admin-modal-footer">
          <button ref={cancelRef} type="button" className="admin-btn admin-btn-secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="admin-btn admin-btn-danger" onClick={onConfirm} disabled={busy || disabled}>
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
