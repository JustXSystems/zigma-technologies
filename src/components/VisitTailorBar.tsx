'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { INDUSTRY_DEFS } from '@/lib/industries';
import { LOCATION_DEFS } from '@/lib/locations';
import { readPrefsFromDocument, writePrefsToDocument } from '@/lib/personalization';

type Props = {
  /** Where this control sits — affects default “Go” destination. */
  context?: 'industries' | 'locations' | 'home';
};

/** Contextual “I’m looking for…” preference — not a global header utility. */
export default function VisitTailorBar({ context = 'industries' }: Props) {
  const router = useRouter();
  const [industry, setIndustry] = useState('');
  const [city, setCity] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const prefs = readPrefsFromDocument();
    setIndustry(prefs.industry || '');
    setCity(prefs.city || '');
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    writePrefsToDocument({
      industry: industry || undefined,
      city: city || undefined,
    });
  }, [industry, city, ready]);

  if (!ready) return null;

  function go() {
    if (industry && city) {
      router.push(`/locations/${city}/ups-systems`);
      return;
    }
    if (industry) {
      router.push(`/industries/${industry}`);
      return;
    }
    if (city) {
      router.push(`/locations/${city}`);
      return;
    }
    router.push(context === 'locations' ? '/locations' : '/industries');
  }

  return (
    <div className="visit-tailor" role="region" aria-label="Tailor this visit">
      <div className="visit-tailor-inner">
        <p className="visit-tailor-title">I’m looking for…</p>
        <div className="visit-tailor-fields">
          <label>
            Industry
            <select value={industry} onChange={(e) => setIndustry(e.target.value)}>
              <option value="">Any</option>
              {INDUSTRY_DEFS.map((i) => (
                <option key={i.key} value={i.key}>
                  {i.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            City
            <select value={city} onChange={(e) => setCity(e.target.value)}>
              <option value="">Any</option>
              {LOCATION_DEFS.map((l) => (
                <option key={l.key} value={l.key}>
                  {l.name}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="btn btn-primary btn-sm" onClick={go}>
            Show matches →
          </button>
        </div>
        <p className="visit-tailor-hint">
          Or browse{' '}
          <Link href="/industries">industries</Link>
          {' · '}
          <Link href="/locations">locations</Link>
        </p>
      </div>
    </div>
  );
}
