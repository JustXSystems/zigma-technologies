import Link from 'next/link';

const COPY = {
  hi: {
    langName: 'हिन्दी',
    title: 'ज़िग्मा टेक्नोलॉजीज़ — सोलर, UPS और पावर समाधान',
    lead: 'भारत भर में सोलर EPC, औद्योगिक UPS, BESS और EV चार्जिंग के लिए इंजीनियरिंग सहायता।',
    ups: 'UPS और पावर निरंतरता',
    solar: 'सोलर EPC और O&M',
    calc: 'UPS कैलकुलेटर',
    locations: 'शहर और सेवाएँ',
    sla: 'सेवा स्तर',
    cta: 'परामर्श का अनुरोध करें',
  },
  kn: {
    langName: 'ಕನ್ನಡ',
    title: 'ಝಿಗ್ಮಾ ಟೆಕ್ನಾಲಜೀಸ್ — ಸೋಲಾರ್, UPS ಮತ್ತು ಪವರ್ ಪರಿಹಾರಗಳು',
    lead: 'ಭಾರತದಾದ್ಯಂತ ಸೋಲಾರ್ EPC, ಕೈಗಾರಿಕಾ UPS, BESS ಮತ್ತು EV ಚಾರ್ಜಿಂಗ್‌ಗೆ ಎಂಜಿನಿಯರಿಂಗ್ ಬೆಂಬಲ.',
    ups: 'UPS ಮತ್ತು ವಿದ್ಯುತ್ ನಿರಂತರತೆ',
    solar: 'ಸೋಲಾರ್ EPC ಮತ್ತು O&M',
    calc: 'UPS ಕ್ಯಾಲ್ಕುಲೇಟರ್',
    locations: 'ನಗರಗಳು ಮತ್ತು ಸೇವೆಗಳು',
    sla: 'ಸೇವಾ ಮಟ್ಟ',
    cta: 'ಸಮಾಲೋಚನೆ ವಿನಂತಿಸಿ',
  },
} as const;

export default function LocaleLanding({ locale }: { locale: 'hi' | 'kn' }) {
  const copy = COPY[locale];
  return (
    <main id="main-content">
      <section className="page-hero" style={{ minHeight: '70vh', padding: '10rem 0 4rem' }}>
        <div className="hero-bg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/images/solar-farm-with-wind-turbines-at-sunset-.jpg" alt="" />
          <div className="hero-overlay"></div>
          <div className="grid-overlay"></div>
        </div>
        <div className="container">
          <div className="eyebrow">{copy.langName}</div>
          <h1>{copy.title}</h1>
          <p className="lead">{copy.lead}</p>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1.25rem' }}>
            <Link href="/products?category=ups-systems" className="btn btn-ghost-dark">
              {copy.ups}
            </Link>
            <Link href="/projects?category=solar-epc" className="btn btn-ghost-dark">
              {copy.solar}
            </Link>
            <Link href="/tools/ups-calculator" className="btn btn-ghost-dark">
              {copy.calc}
            </Link>
            <Link href="/contact?consult=1&consult_subject=Request%20a%20Quote" className="btn btn-primary">
              {copy.cta} →
            </Link>
          </div>
          <p style={{ marginTop: '1.5rem' }}>
            <Link href="/" className="link">
              English site →
            </Link>
            {' · '}
            <Link href="/locations" className="link">
              {copy.locations}
            </Link>
            {' · '}
            <Link href="/sla" className="link">
              {copy.sla}
            </Link>
            {' · '}
            <Link href={locale === 'hi' ? '/kn' : '/hi'} className="link">
              {locale === 'hi' ? 'ಕನ್ನಡ' : 'हिन्दी'}
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
