export function computeThumbnailDimensions(
  width: number,
  height: number,
  maxDim = 400
): { width: number; height: number } {
  if (width <= maxDim && height <= maxDim) return { width, height };
  const scale = maxDim / Math.max(width, height);
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

export async function createThumbnail(file: File, maxDim = 400): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const { width, height } = computeThumbnailDimensions(bitmap.width, bitmap.height, maxDim);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  ctx.drawImage(bitmap, 0, 0, width, height);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Thumbnail encoding failed'))), 'image/jpeg', 0.8);
  });
}
