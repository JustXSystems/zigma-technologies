import { buildPageMetadata } from '@/lib/seo';

export const metadata = buildPageMetadata({
  title: 'Thank you',
  description: 'Your enquiry has been received. Our engineering team will contact you shortly.',
  path: '/thank-you',
  noindex: true,
});

export default function ThankYouLayout({ children }: { children: React.ReactNode }) {
  return children;
}
