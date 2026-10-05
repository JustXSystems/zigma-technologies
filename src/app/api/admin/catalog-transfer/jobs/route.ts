import { jsonOk } from '@/lib/api';
import { requireSession } from '@/lib/auth';
import { listTransferJobs } from '@/lib/catalog-transfer';
import { transferRouteError } from '@/lib/catalog-transfer-route';

export async function GET() {
  try {
    await requireSession();
    return jsonOk({ jobs: await listTransferJobs(15) });
  } catch (error) {
    return transferRouteError(error, 'jobs');
  }
}
