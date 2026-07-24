import { describe, it, expect, beforeEach } from 'vitest';
import { listWishlist, saveWishlistEntry, deleteWishlistEntry } from './wishlist';
import type { WishlistEntry } from '$lib/types';

describe('wishlist storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns an empty array when nothing is stored', () => {
    expect(listWishlist()).toEqual([]);
  });

  it('saves a new entry', () => {
    const entry: WishlistEntry = {
      id: '1',
      countryCode: 'JP',
      rating: 5,
      note: 'Dream destination',
      createdAt: '2026-01-01T00:00:00.000Z'
    };
    saveWishlistEntry(entry);
    expect(listWishlist()).toEqual([entry]);
  });

  it('updates an existing entry matched by id', () => {
    const original: WishlistEntry = {
      id: '1',
      countryCode: 'JP',
      rating: 3,
      note: 'Maybe',
      createdAt: '2026-01-01T00:00:00.000Z'
    };
    saveWishlistEntry(original);
    const updated: WishlistEntry = { ...original, rating: 5, note: 'Dream destination' };
    saveWishlistEntry(updated);
    const all = listWishlist();
    expect(all).toHaveLength(1);
    expect(all[0]).toEqual(updated);
  });

  it('deletes only the targeted entry', () => {
    const a: WishlistEntry = { id: '1', countryCode: 'JP', rating: 5, note: '', createdAt: '2026-01-01T00:00:00.000Z' };
    const b: WishlistEntry = { id: '2', countryCode: 'NO', rating: 4, note: '', createdAt: '2026-01-01T00:00:00.000Z' };
    saveWishlistEntry(a);
    saveWishlistEntry(b);
    deleteWishlistEntry('1');
    expect(listWishlist()).toEqual([b]);
  });
});
