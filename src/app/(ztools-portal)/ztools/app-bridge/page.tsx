import { redirect } from 'next/navigation';
import { setZtoolsSessionCookie, verifyZtoolsBridgeToken } from '@/lib/ztools';

export default async function ZtoolsAppBridgePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  if (!token) redirect('/ztools/login');

  const bridge = await verifyZtoolsBridgeToken(token);
  if (!bridge) redirect('/ztools/login?error=session_expired');

  await setZtoolsSessionCookie(bridge.sessionToken);
  redirect(bridge.redirect);
}
