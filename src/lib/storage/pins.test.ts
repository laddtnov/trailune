import { describe, it, expect, beforeEach } from 'vitest';
import { listPins, savePin, deletePin, deletePinsForTrip } from './pins';
import type { PinEntry } from '$lib/types';

beforeEach(() => {
  localStorage.clear();
});

describe('pins repository', () => {
  const pin1: PinEntry = {
    id: 'pin1',
    tripId: 't1',
    label: 'Cliffs of Moher',
    note: 'Windiest place I have ever stood',
    createdAt: '2026-07-10T00:00:00.000Z'
  };
  const pin2: PinEntry = {
    id: 'pin2',
    tripId: 't1',
    label: 'Shibuya Crossing',
    note: null,
    createdAt: '2026-07-11T00:00:00.000Z'
  };

  it('lists pins scoped to a trip', () => {
    savePin(pin1);
    savePin(pin2);
    savePin({ ...pin1, id: 'pin3', tripId: 't2' });
    expect(listPins('t1')).toEqual([pin1, pin2]);
  });

  it('updates a pin in place', () => {
    savePin(pin1);
    savePin({ ...pin1, note: 'Updated note' });
    expect(listPins('t1')).toEqual([{ ...pin1, note: 'Updated note' }]);
  });

  it('deletes a single pin', () => {
    savePin(pin1);
    deletePin('pin1');
    expect(listPins('t1')).toEqual([]);
  });

  it('deletes all pins for a trip without touching other trips', () => {
    savePin(pin1);
    savePin(pin2);
    savePin({ ...pin1, id: 'pin3', tripId: 't2' });
    deletePinsForTrip('t1');
    expect(listPins('t1')).toEqual([]);
    expect(listPins('t2')).toEqual([{ ...pin1, id: 'pin3', tripId: 't2' }]);
  });
});
