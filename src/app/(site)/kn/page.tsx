import type { Metadata } from 'next';
import LocaleLanding from '@/components/i18n/LocaleLanding';

export const metadata: Metadata = {
  title: 'ಝಿಗ್ಮಾ ಟೆಕ್ನಾಲಜೀಸ್ — ಸೋಲಾರ್, UPS ಮತ್ತು ಪವರ್ ಪರಿಹಾರಗಳು',
  description: 'ಭಾರತದಾದ್ಯಂತ ಸೋಲಾರ್ EPC, ಕೈಗಾರಿಕಾ UPS, BESS ಮತ್ತು EV ಚಾರ್ಜಿಂಗ್‌ಗೆ ಎಂಜಿನಿಯರಿಂಗ್ ಬೆಂಬಲ.',
  alternates: { languages: { en: '/', hi: '/hi', kn: '/kn' } },
};

export default function KannadaHomePage() {
  return <LocaleLanding locale="kn" />;
}
