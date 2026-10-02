import { z } from 'zod';
import { requireScreen } from '@/lib/auth';
import { jsonError } from '@/lib/api';

export async function requireEmailAdmin() {
  return requireScreen('email');
}

export function emailRouteError(error: unknown, fallback: string) {
  if (error instanceof z.ZodError) return jsonError('Invalid payload', 400, { issues: error.issues });
  if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
  if (error instanceof Error && error.message === 'FORBIDDEN') return jsonError('Forbidden', 403);
  return jsonError(error instanceof Error ? error.message : fallback, 500);
}
