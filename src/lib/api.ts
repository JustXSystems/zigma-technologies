import { NextResponse } from 'next/server';
import { z } from 'zod';

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function jsonError(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

export async function readJson<T>(request: Request): Promise<T> {
  return (await request.json()) as T;
}

/** Error codes thrown by route helpers (`throw new Error('CODE')`) → user-facing message + status. */
export type KnownErrors = Record<string, readonly [message: string, status: number]>;

const AUTH_ERRORS: KnownErrors = {
  UNAUTHORIZED: ['Unauthorized', 401],
  FORBIDDEN: ['Forbidden', 403],
};

/** Known codes and validation errors get their message; anything else is logged and stays generic. */
export function errorResponse(
  error: unknown,
  { known = {}, fallback, invalid = 'Invalid request' }: { known?: KnownErrors; fallback: string; invalid?: string }
) {
  if (error instanceof z.ZodError) return jsonError(invalid, 400);
  const hit = error instanceof Error ? (known[error.message] ?? AUTH_ERRORS[error.message]) : undefined;
  if (hit) return jsonError(hit[0], hit[1]);
  console.error(error);
  return jsonError(fallback, 500);
}
