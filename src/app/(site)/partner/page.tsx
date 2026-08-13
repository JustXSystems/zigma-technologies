'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Doc = {
  id: number;
  title: string;
  description: string | null;
  file_url: string;
  doc_type: string;
};

export default function PartnerPortalPage() {
  const router = useRouter();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/partner/documents')
      .then(async (r) => {
        if (r.status === 401) {
          router.replace('/partner/login');
          return null;
        }
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || 'Failed');
        setDocs(data.documents || []);
        setName(data.user?.name || '');
        return data;
      })
      .catch((e) => setError(e.message));
  }, [router]);

  async function logout() {
    await fetch('/api/partner/auth', { method: 'DELETE' });
    router.replace('/partner/login');
  }

  return (
    <main id="main-content" className="section section-light" style={{ paddingTop: '8rem' }}>
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <h1>Partner documents</h1>
            <p className="lead">{name ? `Welcome, ${name}` : 'Loading…'}</p>
          </div>
          <button type="button" className="btn btn-ghost-dark" onClick={logout}>
            Sign out
          </button>
        </div>
        {error ? <p>{error}</p> : null}
        <div className="press-list" style={{ marginTop: '2rem' }}>
          {docs.map((d) => (
            <article key={d.id} className="press-card">
              <h2>{d.title}</h2>
              {d.description ? <p>{d.description}</p> : null}
              <p className="meta">{d.doc_type}</p>
              <a className="link" href={d.file_url} target="_blank" rel="noopener noreferrer">
                Open document →
              </a>
            </article>
          ))}
          {!docs.length && !error ? <p>No documents yet. Ask your Zigma contact to publish price lists.</p> : null}
        </div>
        <p style={{ marginTop: '2rem' }}>
          <Link href="/contact" className="link">
            Contact channel support →
          </Link>
        </p>
      </div>
    </main>
  );
}
