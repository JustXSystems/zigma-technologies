'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import ConsultationWizardModal from '@/components/ConsultationWizardModal';

export default function ConsultationModalHost() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const open = searchParams.get('consult') === '1';
  const preselectedSubject = searchParams.get('consult_subject');

  if (!open) return null;

  return (
    <ConsultationWizardModal
      preselectedSubject={preselectedSubject}
      onClose={() => {
        const params = new URLSearchParams(searchParams);
        params.delete('consult');
        params.delete('consult_subject');
        const qs = params.toString();
        router.replace(qs ? `${pathname}?${qs}` : pathname);
      }}
    />
  );
}

