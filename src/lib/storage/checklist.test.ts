import { describe, it, expect, beforeEach } from 'vitest';
import {
  listPackingItems,
  savePackingItem,
  deletePackingItem,
  deletePackingItemsForTrip,
  listDoDontItems,
  saveDoDontItem,
  deleteDoDontItem,
  deleteDoDontItemsForTrip
} from './checklist';
import type { PackingItem, DoDontItem } from '$lib/types';

beforeEach(() => {
  localStorage.clear();
});

describe('packing items repository', () => {
  const templateItem: PackingItem = { id: 'p1', tripId: null, category: 'Documents', label: 'Passport', checked: false };
  const tripItem: PackingItem = { id: 'p2', tripId: 't1', category: 'Electronics', label: 'Charger', checked: false };

  it('separates template items (tripId null) from trip-scoped items', () => {
    savePackingItem(templateItem);
    savePackingItem(tripItem);
    expect(listPackingItems(null)).toEqual([templateItem]);
    expect(listPackingItems('t1')).toEqual([tripItem]);
  });

  it('updates an item in place', () => {
    savePackingItem(templateItem);
    savePackingItem({ ...templateItem, checked: true });
    expect(listPackingItems(null)).toEqual([{ ...templateItem, checked: true }]);
  });

  it('deletes a single item', () => {
    savePackingItem(templateItem);
    deletePackingItem('p1');
    expect(listPackingItems(null)).toEqual([]);
  });

  it('deletes all items for a trip without touching the template', () => {
    savePackingItem(templateItem);
    savePackingItem(tripItem);
    deletePackingItemsForTrip('t1');
    expect(listPackingItems('t1')).toEqual([]);
    expect(listPackingItems(null)).toEqual([templateItem]);
  });
});

describe('do/dont items repository', () => {
  const doItem: DoDontItem = { id: 'd1', tripId: 't1', type: 'do', text: 'Learn basic phrases', checked: false };
  const dontItem: DoDontItem = { id: 'd2', tripId: 't1', type: 'dont', text: 'Tip at restaurants', checked: false };

  it('lists items scoped to a trip', () => {
    saveDoDontItem(doItem);
    saveDoDontItem(dontItem);
    saveDoDontItem({ ...doItem, id: 'd3', tripId: 't2' });
    expect(listDoDontItems('t1')).toEqual([doItem, dontItem]);
  });

  it('deletes a single item', () => {
    saveDoDontItem(doItem);
    deleteDoDontItem('d1');
    expect(listDoDontItems('t1')).toEqual([]);
  });

  it('deletes all items for a trip', () => {
    saveDoDontItem(doItem);
    saveDoDontItem(dontItem);
    deleteDoDontItemsForTrip('t1');
    expect(listDoDontItems('t1')).toEqual([]);
  });
});
