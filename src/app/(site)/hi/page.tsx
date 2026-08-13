import type { Metadata } from 'next';
import LocaleLanding from '@/components/i18n/LocaleLanding';

export const metadata: Metadata = {
  title: 'ज़िग्मा टेक्नोलॉजीज़ — सोलर, UPS और पावर समाधान',
  description: 'भारत भर में सोलर EPC, औद्योगिक UPS, BESS और EV चार्जिंग के लिए इंजीनियरिंग सहायता।',
  alternates: { languages: { en: '/', hi: '/hi', kn: '/kn' } },
};

export default function HindiHomePage() {
  return <LocaleLanding locale="hi" />;
}
