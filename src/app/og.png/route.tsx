import { ImageResponse } from 'next/og';

const PILLARS = ['Solar EPC', 'UPS & Power Continuity', 'BESS', 'EV Charging', 'AMC & Field Services'];

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px 80px',
          background: 'linear-gradient(135deg, #0A1628 0%, #122647 60%, #0F1F3D 100%)',
          color: '#FFFFFF',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{ width: 18, height: 64, background: '#FF6B1A', borderRadius: 4 }} />
          <div style={{ fontSize: 44, fontWeight: 700, letterSpacing: -1 }}>Zigma Technologies</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ fontSize: 68, fontWeight: 700, lineHeight: 1.08, letterSpacing: -2, maxWidth: 980 }}>
            Power &amp; Energy Engineering Across India
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
            {PILLARS.map((p) => (
              <div
                key={p}
                style={{
                  fontSize: 26,
                  padding: '10px 22px',
                  borderRadius: 999,
                  border: '2px solid rgba(0,212,255,0.55)',
                  color: '#00D4FF',
                }}
              >
                {p}
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 26, color: 'rgba(255,255,255,0.75)' }}>
          <div>20+ years · Installation · AMC · 24×7 support</div>
          <div style={{ color: '#FF6B1A' }}>zigma-technologies.com</div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: { 'Cache-Control': 'public, max-age=86400, s-maxage=604800' },
    }
  );
}
