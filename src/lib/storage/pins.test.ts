import { describe, it, expect, beforeEach } from 'vitest';
import { listPins, savePin, deletePin, deletePinsForTrip, reorderPins } from './pins';
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
    order: 0,
    createdAt: '2026-07-10T00:00:00.000Z'
  };
  const pin2: PinEntry = {
    id: 'pin2',
    tripId: 't1',
    label: 'Shibuya Crossing',
    note: null,
    order: 1,
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

describe('listPins order backfill', () => {
  it('backfills order from array position for legacy pins with no stored order', () => {
    localStorage.setItem(
      'trailune:pins',
      JSON.stringify([
        { id: 'legacy1', tripId: 't1', label: 'First', note: null, createdAt: '2026-07-01T00:00:00.000Z' },
        { id: 'legacy2', tripId: 't1', label: 'Second', note: null, createdAt: '2026-07-02T00:00:00.000Z' }
      ])
    );

    const pins = listPins('t1');

    expect(pins.find((p) => p.id === 'legacy1')?.order).toBe(0);
    expect(pins.find((p) => p.id === 'legacy2')?.order).toBe(1);
  });

  it('preserves an explicit order value instead of overwriting it with the array-index default', () => {
    localStorage.setItem(
      'trailune:pins',
      JSON.stringify([
        { id: 'a', tripId: 't1', label: 'A', note: null, order: 5, createdAt: '2026-07-01T00:00:00.000Z' },
        { id: 'b', tripId: 't1', label: 'B', note: null, order: 2, createdAt: '2026-07-02T00:00:00.000Z' }
      ])
    );

    const pins = listPins('t1');

    expect(pins.find((p) => p.id === 'a')?.order).toBe(5);
    expect(pins.find((p) => p.id === 'b')?.order).toBe(2);
  });
});

describe('reorderPins', () => {
  it('rewrites order for pins in the given trip based on their position in the id list', () => {
    savePin({ id: 'p1', tripId: 't1', label: 'A', note: null, order: 0, createdAt: '2026-07-01T00:00:00.000Z' });
    savePin({ id: 'p2', tripId: 't1', label: 'B', note: null, order: 1, createdAt: '2026-07-02T00:00:00.000Z' });
    savePin({ id: 'p3', tripId: 't1', label: 'C', note: null, order: 2, createdAt: '2026-07-03T00:00:00.000Z' });

    reorderPins('t1', ['p3', 'p1', 'p2']);

    const pins = listPins('t1');
    expect(pins.find((p) => p.id === 'p3')?.order).toBe(0);
    expect(pins.find((p) => p.id === 'p1')?.order).toBe(1);
    expect(pins.find((p) => p.id === 'p2')?.order).toBe(2);
  });

  it('does not affect pins belonging to a different trip', () => {
    savePin({ id: 'p1', tripId: 't1', label: 'A', note: null, order: 0, createdAt: '2026-07-01T00:00:00.000Z' });
    savePin({ id: 'q1', tripId: 't2', label: 'X', note: null, order: 0, createdAt: '2026-07-01T00:00:00.000Z' });

    reorderPins('t1', ['p1']);

    expect(listPins('t2').find((p) => p.id === 'q1')?.order).toBe(0);
  });
});
