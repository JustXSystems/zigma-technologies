import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Partner portal',
  robots: { index: false, follow: false },
};

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  return children;
}
