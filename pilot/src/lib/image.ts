import type { AttachmentMeta } from '../domain/types';

export const IMAGE_LIMITS = { maxBytes: 6 * 1024 * 1024, maxEdge: 1600, accept: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'] };

/** Validate + downscale a photo client-side before it ever leaves the device. */
export async function prepareImage(file: File): Promise<{ meta: AttachmentMeta; blob: Blob; previewUrl: string }> {
  if (!IMAGE_LIMITS.accept.includes(file.type) && !file.type.startsWith('image/')) throw new Error('Filen må være et bilde');
  if (file.size > IMAGE_LIMITS.maxBytes) throw new Error('Bildet er for stort (maks 6 MB)');
  let blob: Blob = file; let width: number | undefined; let height: number | undefined;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, IMAGE_LIMITS.maxEdge / Math.max(bmp.width, bmp.height));
    width = Math.round(bmp.width * scale); height = Math.round(bmp.height * scale);
    if (scale < 1 && typeof document !== 'undefined') {
      const c = document.createElement('canvas'); c.width = width; c.height = height;
      c.getContext('2d')!.drawImage(bmp, 0, 0, width, height);
      blob = await new Promise<Blob>((res) => c.toBlob((b) => res(b || file), 'image/jpeg', 0.85));
    }
  } catch { /* HEIC in some browsers: keep original, still valid */ }
  const previewUrl = URL.createObjectURL(blob);
  const meta: AttachmentMeta = { id: `att_${Date.now().toString(36)}`, kind: 'image', name: file.name || 'bilde.jpg', mimeType: blob.type || file.type, sizeBytes: blob.size, width, height, previewUrl };
  return { meta, blob, previewUrl };
}

/** Storage path scoped by tenant. Used by the Supabase provider; local mode keeps only metadata. */
export function storagePathFor(orgId: string, locId: string, userId: string, meta: AttachmentMeta): string {
  const safe = meta.name.replace(/[^\w.\-]+/g, '_').slice(0, 80);
  return `org/${orgId}/loc/${locId}/${userId}/${meta.id}-${safe}`;
}
