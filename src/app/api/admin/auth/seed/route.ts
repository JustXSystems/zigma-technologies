import { ensureSeedAdmin } from '@/lib/auth';
import { jsonError, jsonOk } from '@/lib/api';

export async function POST() {
  try {
    const result = await ensureSeedAdmin();
    return jsonOk({
      ...result,
      message: result.created
        ? `Created admin ${result.email}. Default password from ADMIN_PASSWORD (or ChangeMeNow!123).`
        : `Admin ${result.email} already exists.`,
    });
  } catch (error) {
    console.error(error);
    return jsonError(
      error instanceof Error
        ? error.message
        : 'Seed failed. Ensure MySQL is running and schema is applied.',
      500
    );
  }
}
