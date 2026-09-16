'use client';

import { useId, useState, type ReactNode } from 'react';

type Props = {
  title: string;
  description?: string;
  children: ReactNode;
  /** When true, section starts expanded. */
  defaultOpen?: boolean;
  className?: string;
  /** Optional controls shown beside the toggle (must not nest buttons inside the toggle). */
  badge?: ReactNode;
};

export default function AdminCollapsible({
  title,
  description,
  children,
  defaultOpen = true,
  className = '',
  badge,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  return (
    <section className={`admin-collapse${open ? ' is-open' : ''}${className ? ` ${className}` : ''}`}>
      <div className="admin-collapse-header">
        <button
          type="button"
          className="admin-collapse-toggle"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((v) => !v)}
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
