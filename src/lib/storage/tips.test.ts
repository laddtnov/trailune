import { describe, it, expect, beforeEach } from 'vitest';
import { listTips, getTip, saveTip, deleteTip, deleteTipsForTrip } from './tips';
import type { TipEntry } from '$lib/types';

const tip: TipEntry = {
  id: 'tip1',
  tripId: 't1',
  category: 'currency',
  note: 'Best rate near the train station',
  photoId: null,
  createdAt: '2026-01-01T00:00:00.000Z'
};

beforeEach(() => {
  localStorage.clear();
});

describe('tips repository', () => {
  it('starts empty', () => {
    expect(listTips('t1')).toEqual([]);
  });

  it('saves and retrieves a tip scoped to its trip', () => {
    saveTip(tip);
    saveTip({ ...tip, id: 'tip2', tripId: 't2' });
    expect(listTips('t1')).toEqual([tip]);
    expect(getTip('tip1')).toEqual(tip);
  });

  it('updates an existing tip in place instead of duplicating it', () => {
    saveTip(tip);
    saveTip({ ...tip, note: 'Updated note' });
    expect(listTips('t1')).toHaveLength(1);
    expect(listTips('t1')[0].note).toBe('Updated note');
  });

  it('deletes a single tip', () => {
    saveTip(tip);
    deleteTip('tip1');
    expect(listTips('t1')).toEqual([]);
  });

  it('deletes all tips for a trip without touching other trips', () => {
    saveTip(tip);
    saveTip({ ...tip, id: 'tip2' });
    saveTip({ ...tip, id: 'tip3', tripId: 't2' });
    deleteTipsForTrip('t1');
    expect(listTips('t1')).toEqual([]);
    expect(listTips('t2')).toHaveLength(1);
  });
});
