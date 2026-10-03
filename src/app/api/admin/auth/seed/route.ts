import { ensureSeedAdmin } from '@/lib/auth';
import { jsonError, jsonOk } from '@/lib/api';

export async function POST() {
  try {
    const result = await ensureSeedAdmin();
    return jsonOk({
      ...result,
      message: result.created
        ? `Created admin ${result.email}. Default password from ADMIN_PASSWORD (or ChangeMeNow!123).`
        : 'Admin accounts already exist. Sign in, or ask a full admin to reset your password.',
    });
  } catch (error) {
    console.error(error);
    return jsonError('Seed failed. Ensure MySQL is running and schema is applied.', 500);
  }
}
