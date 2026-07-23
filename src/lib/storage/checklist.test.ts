import { describe, it, expect, beforeEach } from 'vitest';
import {
  listPackingItems,
  listTemplateItems,
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
  const generalItem: PackingItem = {
    id: 'p1',
    tripId: null,
    templateId: 'general',
    category: 'Documents',
    label: 'Passport',
    checked: false
  };
  const beachItem: PackingItem = {
    id: 'p2',
    tripId: null,
    templateId: 'beach',
    category: 'Clothing',
    label: 'Swimsuit',
    checked: false
  };
  const tripItem: PackingItem = {
    id: 'p3',
    tripId: 't1',
    templateId: null,
    category: 'Electronics',
    label: 'Charger',
    checked: false
  };

  it('separates template items by templateId and trip-scoped items by tripId', () => {
    savePackingItem(generalItem);
    savePackingItem(beachItem);
    savePackingItem(tripItem);
    expect(listTemplateItems('general')).toEqual([generalItem]);
    expect(listTemplateItems('beach')).toEqual([beachItem]);
    expect(listPackingItems('t1')).toEqual([tripItem]);
  });

  it('treats a legacy item with no templateId field as general', () => {
    const legacyItem = {
      id: 'p4',
      tripId: null,
      category: 'Documents',
      label: 'Old passport',
      checked: false
    } as PackingItem;
    savePackingItem(legacyItem);
    expect(listTemplateItems('general')).toEqual([legacyItem]);
    expect(listTemplateItems('beach')).toEqual([]);
  });

  it('updates an item in place', () => {
    savePackingItem(generalItem);
    savePackingItem({ ...generalItem, checked: true });
    expect(listTemplateItems('general')).toEqual([{ ...generalItem, checked: true }]);
  });

  it('deletes a single item', () => {
    savePackingItem(generalItem);
    deletePackingItem('p1');
    expect(listTemplateItems('general')).toEqual([]);
  });

  it('deletes all items for a trip without touching templates', () => {
    savePackingItem(generalItem);
    savePackingItem(tripItem);
    deletePackingItemsForTrip('t1');
    expect(listPackingItems('t1')).toEqual([]);
    expect(listTemplateItems('general')).toEqual([generalItem]);
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
