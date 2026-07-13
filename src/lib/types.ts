export interface Trip {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  countries: string[];
  createdAt: string;
}

export interface JournalEntry {
  id: string;
  tripId: string;
  date: string;
  note: string;
  photoIds: string[];
}

export interface Photo {
  id: string;
  blob: Blob;
  thumbnailBlob: Blob;
  createdAt: string;
}

export type PackingCategory = 'Documents' | 'Electronics' | 'Clothing' | 'Toiletries' | 'Other';

export interface PackingItem {
  id: string;
  tripId: string | null;
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
