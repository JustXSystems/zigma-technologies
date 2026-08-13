'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { trackEvent } from '@/lib/analytics';
import { useSiteCopy } from '@/lib/use-site-copy';

export default function SiteSearchForm({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [expanded, setExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLFormElement>(null);
  const copy = useSiteCopy();

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const query = q.trim();
    if (!query) {
      setExpanded(true);
      inputRef.current?.focus();
      return;
    }
    trackEvent('search', { q: query });
    router.push(`/search?q=${encodeURIComponent(query)}`);
  }

  useEffect(() => {
    if (!compact || !expanded) return;
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setExpanded(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [compact, expanded]);

  if (!compact) {
    return (
      <form className="site-search" onSubmit={onSubmit} role="search">
        <label className="sr-only" htmlFor="site-search-page-q">
          {copy.searchForm.ariaLabel}
        </label>
        <input
          id="site-search-page-q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={copy.searchForm.placeholder}
          type="search"
        />
        <button type="submit" aria-label={copy.searchForm.ariaLabel}>
          ⌕
        </button>
      </form>
    );
  }

  return (
    <form
      ref={wrapRef}
      className={`site-search site-search--compact${expanded ? ' is-expanded' : ''}`}
      onSubmit={onSubmit}
      role="search"
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => {
        if (!q && document.activeElement !== inputRef.current) setExpanded(false);
      }}
      onFocusCapture={() => setExpanded(true)}
    >
      <label className="sr-only" htmlFor="site-search-q">
        {copy.searchForm.ariaLabel}
      </label>
      <button
        type="submit"
        aria-label={copy.searchForm.ariaLabel}
        onClick={(e) => {
          if (!expanded) {
            e.preventDefault();
            setExpanded(true);
            requestAnimationFrame(() => inputRef.current?.focus());
          }
        }}
      >
        ⌕
      </button>
      <input
        ref={inputRef}
        id="site-search-q"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={copy.searchForm.placeholder}
        type="search"
        tabIndex={expanded ? 0 : -1}
        aria-hidden={!expanded}
      />
    </form>
  );
}
