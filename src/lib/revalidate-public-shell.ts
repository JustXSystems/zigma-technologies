import { revalidatePath } from 'next/cache';
import { appBasePath } from '@/lib/base-path';

/** Bust cached layout chrome after CMS nav/settings changes. */
export function revalidatePublicShell() {
  const base = appBasePath();
  const root = base || '/';
  revalidatePath(root, 'layout');
  // Also refresh common entry routes that embed the same layout chrome.
  revalidatePath(root === '/' ? '/' : root);
  if (root === '/') {
    revalidatePath('/contact');
    revalidatePath('/careers');
    revalidatePath('/products');
    revalidatePath('/services');
  }
}
