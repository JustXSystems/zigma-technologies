import { revalidatePath } from 'next/cache';
import { appBasePath } from '@/lib/base-path';

/** Bust cached layout chrome after CMS nav/settings changes. */
export function revalidatePublicShell() {
  const base = appBasePath();
  revalidatePath(base || '/', 'layout');
}
