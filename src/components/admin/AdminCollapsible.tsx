'use client';

import { useId, useState, type ReactNode } from 'react';

type Props = {
  title: string;
  description?: string;
  children: ReactNode;
  /** When true, section starts expanded (uncontrolled). Ignored when `open` is set. */
  defaultOpen?: boolean;
  /** Controlled open state. When set, the parent owns expand/collapse. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
  /** Optional controls shown beside the toggle (must not nest buttons inside the toggle). */
  badge?: ReactNode;
};

export default function AdminCollapsible({
  title,
  description,
  children,
  defaultOpen = false,
  open: openProp,
  onOpenChange,
  className = '',
  badge,
}: Props) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const controlled = openProp !== undefined;
  const open = controlled ? openProp : uncontrolledOpen;
  const panelId = useId();

  function setOpen(next: boolean) {
    if (!controlled) setUncontrolledOpen(next);
    onOpenChange?.(next);
  }

  return (
    <section className={`admin-collapse${open ? ' is-open' : ''}${className ? ` ${className}` : ''}`}>
      <div className="admin-collapse-header">
        <button
          type="button"
          className="admin-collapse-toggle"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen(!open)}
        >
          <span className="admin-collapse-chevron" aria-hidden="true" />
          <span className="admin-collapse-copy">
            <span className="admin-collapse-title">{title}</span>
            {description ? <span className="admin-collapse-desc">{description}</span> : null}
          </span>
        </button>
        {badge ? <div className="admin-collapse-badge">{badge}</div> : null}
      </div>
      <div id={panelId} className="admin-collapse-panel" hidden={!open}>
        {children}
      </div>
    </section>
  );
}
