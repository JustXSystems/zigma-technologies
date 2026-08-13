import Link from 'next/link';

export default function NotFound() {
  return (
    <main
      id="main-content"
      style={{
        minHeight: '70vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1.5rem',
        textAlign: 'center',
      }}
    >
      <div style={{ maxWidth: 520 }}>
        <p className="eyebrow eyebrow-orange" style={{ marginBottom: '0.75rem' }}>
          404
        </p>
        <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.4rem)', marginBottom: '0.75rem' }}>Page not found</h1>
        <p style={{ color: 'var(--graphite-500)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
          The page you requested may have moved or no longer exists. Try the homepage or contact our team for help.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/" className="btn btn-primary">
            Back to home
          </Link>
          <Link href="/contact" className="btn btn-ghost-dark">
            Contact us
          </Link>
        </div>
      </div>
    </main>
  );
}
