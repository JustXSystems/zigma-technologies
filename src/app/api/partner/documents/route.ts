import { jsonError, jsonOk } from '@/lib/api';
import { getPartnerSession, listPartnerDocuments } from '@/lib/partners';

export async function GET() {
  const session = await getPartnerSession();
  if (!session) return jsonError('Unauthorized', 401);
  const documents = await listPartnerDocuments();
  return jsonOk({ documents, user: session });
}
