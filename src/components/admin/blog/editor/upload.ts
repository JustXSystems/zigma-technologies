/** Uploads an image to the media library (same file twice = same asset) and returns its public path. */
export async function uploadImage(file: File): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  form.append('dedupe', '1');
  form.append('original_name', file.name || `pasted-image.${file.type.split('/')[1] || 'png'}`);
  const res = await fetch('/api/admin/media', { method: 'POST', body: form });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.path) throw new Error(data.error || 'Image upload failed');
  return String(data.path);
}

/** "solar-roof_02.jpg" → "Solar roof 02"; camera and timestamp names give nothing. */
export function altFromFileName(name: string) {
  const base = name
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/^(img|dsc|image|screenshot|pasted[- ]image)[-_ ]?\d*/i, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!base || /^\d+$/.test(base.replace(/\s/g, ''))) return '';
  return base.charAt(0).toUpperCase() + base.slice(1);
}

export const imageFiles = (list: FileList | File[] | null | undefined) => Array.from(list || []).filter((f) => f.type.startsWith('image/'));
