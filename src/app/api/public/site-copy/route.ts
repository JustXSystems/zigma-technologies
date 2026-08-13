import { jsonError, jsonOk } from '@/lib/api';
import { getSiteCopy } from '@/lib/site-content';

export async function GET() {
  try {
    const copy = await getSiteCopy();
    return jsonOk({ copy });
  } catch (error) {
    console.error(error);
    return jsonError('Failed to load site copy', 500);
  }
}
