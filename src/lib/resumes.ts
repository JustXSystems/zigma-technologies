import { access, mkdir, readFile, writeFile } from 'fs/promises';
import { constants } from 'fs';
import path from 'path';
import {
  legacyAssetDiskPaths,
  publicUploadDiskDir,
  publicUploadPublicPath,
  resolvePublicAssetDiskPath,
} from '@/lib/media-paths';

export function resumesDir() {
  return publicUploadDiskDir('resumes');
}

export function resolveResumeDiskPath(storedName: string) {
  return path.join(resumesDir(), path.basename(storedName));
}

export function resumeStoredPath(storedName: string) {
  return publicUploadPublicPath('resumes', storedName);
}

export async function ensureResumesDir() {
  await mkdir(resumesDir(), { recursive: true });
}

export async function saveResumeFile(storedName: string, buffer: Buffer) {
  await ensureResumesDir();
  const absolute = resolveResumeDiskPath(storedName);
  await writeFile(absolute, buffer);
  return absolute;
}

/** Read resume from /assets/uploads/resumes with legacy fallbacks. */
export async function readResumeFile(stored: string): Promise<{ buffer: Buffer; absolute: string } | null> {
  const name = path.basename(stored);
  const candidates = [
    resolveResumeDiskPath(name),
    ...legacyAssetDiskPaths(stored),
    path.join(process.cwd(), 'storage', 'resumes', name),
    path.join(process.cwd(), 'public', 'uploads', 'resumes', name),
  ];

  for (const candidate of [...new Set(candidates)]) {
    try {
      await access(candidate, constants.R_OK);
      return { buffer: await readFile(candidate), absolute: candidate };
    } catch {
      /* try next */
    }
  }

  const fromPublic = resolvePublicAssetDiskPath(stored);
  if (fromPublic) {
    try {
      await access(fromPublic, constants.R_OK);
      return { buffer: await readFile(fromPublic), absolute: fromPublic };
    } catch {
      return null;
    }
  }

  return null;
}
