export type TransportMode = 'flight' | 'train' | 'road' | 'boat' | 'other';

export interface Trip {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  countries: string[];
  transportMode: TransportMode;
  createdAt: string;
}

export interface JournalEntry {
  id: string;
  tripId: string;
  date: string;
  note: string;
  photoIds: string[];
  rating?: number;
}

export interface Photo {
  id: string;
  blob: Blob;
  thumbnailBlob: Blob;
  createdAt: string;
}

export type PackingCategory = 'Documents' | 'Electronics' | 'Clothing' | 'Toiletries' | 'Other';

export type PackingTemplateId = 'general' | 'beach' | 'business' | 'camping' | 'winter';

export interface PackingItem {
  id: string;
  tripId: string | null;
  templateId: PackingTemplateId | null;
  category: PackingCategory;
  label: string;
  checked: boolean;
}

export interface DoDontItem {
  id: string;
  tripId: string;
  type: 'do' | 'dont';
  text: string;
  checked: boolean;
}

export type TipCategory = 'currency' | 'avoid' | 'transit' | 'sightseeing';

export interface TipEntry {
  id: string;
  tripId: string;
  category: TipCategory;
  note: string;
  photoId: string | null;
  createdAt: string;
}

export interface PinEntry {
  id: string;
  tripId: string;
  label: string;
  note: string | null;
  createdAt: string;
}

export interface WishlistEntry {
  id: string;
  countryCode: string;
  rating: number;
  note: string;
  createdAt: string;
}
