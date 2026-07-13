import { describe, it, expect } from 'vitest';
import { savePhoto, getPhoto, deletePhoto } from './photos';

describe('photos store', () => {
  it('saves and retrieves a photo by id', async () => {
    const blob = new Blob(['fake image data'], { type: 'image/jpeg' });
    await savePhoto({ id: 'p1', blob, thumbnailBlob: blob, createdAt: '2026-01-01T00:00:00.000Z' });
    const result = await getPhoto('p1');
    expect(result?.id).toBe('p1');
  });

  it('returns undefined for a missing photo', async () => {
    const result = await getPhoto('does-not-exist');
    expect(result).toBeUndefined();
  });

  it('deletes a photo', async () => {
    const blob = new Blob(['x'], { type: 'image/jpeg' });
    await savePhoto({ id: 'p2', blob, thumbnailBlob: blob, createdAt: '2026-01-01T00:00:00.000Z' });
    await deletePhoto('p2');
    const result = await getPhoto('p2');
    expect(result).toBeUndefined();
  });
});
