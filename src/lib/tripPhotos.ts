import { listJournalEntries, listTips } from '$lib/storage/storage';
import { getPhoto } from '$lib/storage/photos';
import type { TipCategory } from '$lib/types';

export interface GalleryPhoto {
  photoId: string;
  thumbnailBlob: Blob;
  blob: Blob;
  caption: string;
}

const TIP_CATEGORY_LABELS: Record<TipCategory, string> = {
  currency: 'Currency',
  avoid: 'Avoid',
  transit: 'Getting Around',
  sightseeing: 'Sightseeing'
};

function formatEntryDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export async function collectTripPhotos(tripId: string): Promise<GalleryPhoto[]> {
  const photos: GalleryPhoto[] = [];

  const entries = listJournalEntries(tripId).sort((a, b) => b.date.localeCompare(a.date));
  for (const entry of entries) {
    for (const photoId of entry.photoIds) {
      const photo = await getPhoto(photoId);
      if (!photo) continue;
      photos.push({
        photoId,
        thumbnailBlob: photo.thumbnailBlob,
        blob: photo.blob,
        caption: `Journal · ${formatEntryDate(entry.date)}`
      });
    }
  }

  const tips = listTips(tripId);
  for (const tip of tips) {
    if (!tip.photoId) continue;
    const photo = await getPhoto(tip.photoId);
    if (!photo) continue;
    photos.push({
      photoId: tip.photoId,
      thumbnailBlob: photo.thumbnailBlob,
      blob: photo.blob,
      caption: `Tip · ${TIP_CATEGORY_LABELS[tip.category]}`
    });
  }

  return photos;
}
