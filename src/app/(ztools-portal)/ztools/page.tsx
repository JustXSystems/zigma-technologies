import { redirect } from 'next/navigation';
import { getZtoolsSession } from '@/lib/ztools';

export default async function ZtoolsIndexPage() {
  const session = await getZtoolsSession();
  redirect(session ? '/ztools/dashboard' : '/ztools/login');
}
