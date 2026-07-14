import { generateId } from '$lib/utils/id';
import { createThumbnail } from '$lib/utils/image';
import type { Trip, JournalEntry, TransportMode } from '$lib/types';
import * as trips from './local';
import * as checklist from './checklist';
import * as photoStore from './photos';

export * from './local';
export * from './checklist';
export { getPhoto, deletePhoto } from './photos';

export function createTrip(input: {
  name: string;
  startDate: string;
  endDate: string;
  countries: string[];
  transportMode?: TransportMode;
}): Trip {
  const trip: Trip = {
    id: generateId(),
    name: input.name,
    startDate: input.startDate,
    endDate: input.endDate,
    countries: input.countries,
    transportMode: input.transportMode ?? 'flight',
    createdAt: new Date().toISOString()
  };
  trips.saveTrip(trip);

  const templateItems = checklist.listPackingItems(null);
  for (const item of templateItems) {
    checklist.savePackingItem({ ...item, id: generateId(), tripId: trip.id, checked: false });
  }

  return trip;
}

export async function deleteJournalEntryWithPhotos(id: string): Promise<void> {
  const entry = trips.getJournalEntry(id);
  if (entry) {
    for (const photoId of entry.photoIds) {
      await photoStore.deletePhoto(photoId);
    }
  }
  trips.deleteJournalEntry(id);
}

export async function deleteTripCascade(tripId: string): Promise<void> {
  const entries = trips.listJournalEntries(tripId);
  for (const entry of entries) {
    for (const photoId of entry.photoIds) {
      await photoStore.deletePhoto(photoId);
    }
  }
  trips.deleteJournalEntriesForTrip(tripId);
  checklist.deletePackingItemsForTrip(tripId);
  checklist.deleteDoDontItemsForTrip(tripId);
  trips.deleteTrip(tripId);
}

export async function addJournalEntry(
  tripId: string,
  input: { date: string; note: string; photoFiles: File[] }
): Promise<JournalEntry> {
  const photoIds: string[] = [];
  for (const file of input.photoFiles) {
    const id = generateId();
    let thumbnailBlob: Blob;
    try {
      thumbnailBlob = await createThumbnail(file);
    } catch {
      thumbnailBlob = file;
    }
    await photoStore.savePhoto({ id, blob: file, thumbnailBlob, createdAt: new Date().toISOString() });
    photoIds.push(id);
  }

  const entry: JournalEntry = {
    id: generateId(),
    tripId,
    date: input.date,
    note: input.note,
    photoIds
  };
  trips.saveJournalEntry(entry);
  return entry;
}
