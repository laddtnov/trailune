import { generateId } from '$lib/utils/id';
import { createThumbnail } from '$lib/utils/image';
import type { Trip, JournalEntry, TransportMode, TipEntry, TipCategory, PackingTemplateId } from '$lib/types';
import * as trips from './local';
import * as checklist from './checklist';
import * as photoStore from './photos';
import * as tipsRepo from './tips';
import * as pinsRepo from './pins';

export * from './local';
export * from './checklist';
export * from './tips';
export * from './pins';
export { getPhoto, deletePhoto } from './photos';

export function createTrip(input: {
  name: string;
  startDate: string;
  endDate: string;
  countries: string[];
  transportMode?: TransportMode;
  packingTemplateId?: PackingTemplateId;
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

  const templateItems = checklist.listTemplateItems(input.packingTemplateId ?? 'general');
  for (const item of templateItems) {
    checklist.savePackingItem({ ...item, id: generateId(), tripId: trip.id, templateId: null, checked: false });
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
  pinsRepo.deletePinsForTrip(tripId);

  const tripTips = tipsRepo.listTips(tripId);
  for (const tip of tripTips) {
    if (tip.photoId) {
      await photoStore.deletePhoto(tip.photoId);
    }
  }
  tipsRepo.deleteTipsForTrip(tripId);

  trips.deleteTrip(tripId);
}

export async function addJournalEntry(
  tripId: string,
  input: { date: string; note: string; photoFiles: File[]; rating?: number }
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
    photoIds,
    rating: input.rating
  };
  trips.saveJournalEntry(entry);
  return entry;
}

export async function addTipEntry(
  tripId: string,
  input: { category: TipCategory; note: string; photoFile: File | null }
): Promise<TipEntry> {
  let photoId: string | null = null;
  if (input.photoFile) {
    photoId = generateId();
    let thumbnailBlob: Blob;
    try {
      thumbnailBlob = await createThumbnail(input.photoFile);
    } catch {
      thumbnailBlob = input.photoFile;
    }
    await photoStore.savePhoto({
      id: photoId,
      blob: input.photoFile,
      thumbnailBlob,
      createdAt: new Date().toISOString()
    });
  }

  const tip: TipEntry = {
    id: generateId(),
    tripId,
    category: input.category,
    note: input.note,
    photoId,
    createdAt: new Date().toISOString()
  };
  tipsRepo.saveTip(tip);
  return tip;
}

export async function deleteTipEntryWithPhoto(id: string): Promise<void> {
  const tip = tipsRepo.getTip(id);
  if (tip?.photoId) {
    await photoStore.deletePhoto(tip.photoId);
  }
  tipsRepo.deleteTip(id);
}
