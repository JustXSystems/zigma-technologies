'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import InnerPageHero from '@/components/InnerPageHero';
import SiteSearchForm from '@/components/SiteSearchForm';
import { trackEvent } from '@/lib/analytics';

type Result = { type: string; title: string; href: string; excerpt?: string };

function SearchInner() {
  const searchParams = useSearchParams();
  const q = searchParams.get('q') || '';
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    fetch(`/api/public/search?q=${encodeURIComponent(q)}`)
      .then(async (r) => r.json())
      .then((data) => {
        setResults(data.results || []);
        trackEvent('search', { q, count: (data.results || []).length });
      })
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, [q]);

  return (
    <main id="main-content" className="hub-page">
      <InnerPageHero
        accent="cyan"
        eyebrow="Search"
        title="Find products, projects, guides & pages"
        lead="Search the live catalog, resources, and key site pages."
        image="/assets/images/engineers-reviewing-electrical-design-dr.jpg"
      >
        <div style={{ marginTop: '1.35rem', maxWidth: 480 }} className="page-hero-search">
          <SiteSearchForm />
        </div>
      </InnerPageHero>

      <section className="hub-section hub-section--soft">
        <div className="container" style={{ maxWidth: 860 }}>
          {q.trim().length < 2 ? <p className="search-hint">Enter at least 2 characters to search.</p> : null}
          {loading ? <p className="search-hint">Searching…</p> : null}
          {!loading && q.trim().length >= 2 && !results.length ? (
            <p className="search-hint">No results for “{q}”.</p>
          ) : null}
          <ul className="search-results">
            {results.map((r) => (
              <li key={`${r.type}-${r.href}`}>
                <span className="search-result-type">{r.type}</span>
                <Link href={r.href}>{r.title}</Link>
                {r.excerpt ? <p>{r.excerpt}</p> : null}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <main id="main-content">
          <div className="container" style={{ padding: '6rem 0' }}>
            Loading…
          </div>
        </main>
      }
    >
      <SearchInner />
    </Suspense>
  );
}
