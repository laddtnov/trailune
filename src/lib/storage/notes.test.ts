import { describe, it, expect, beforeEach } from 'vitest';
import { getNote, saveNote, deleteNoteForTrip } from './notes';

beforeEach(() => {
  localStorage.clear();
});

describe('notes repository', () => {
  it('returns undefined when no note exists for a trip', () => {
    expect(getNote('t1')).toBeUndefined();
  });

  it('creates a new note when none exists', () => {
    saveNote('t1', 'Remember to pack sunscreen');

    const note = getNote('t1');
    expect(note?.tripId).toBe('t1');
    expect(note?.text).toBe('Remember to pack sunscreen');
    expect(note?.updatedAt).toBeTruthy();
  });

  it('updates an existing note in place rather than creating a duplicate', () => {
    saveNote('t1', 'First draft');
    saveNote('t1', 'Revised draft');

    expect(getNote('t1')?.text).toBe('Revised draft');
  });

  it('removes a trip note without affecting other trips', () => {
    saveNote('t1', 'Trip 1 note');
    saveNote('t2', 'Trip 2 note');

    deleteNoteForTrip('t1');

    expect(getNote('t1')).toBeUndefined();
    expect(getNote('t2')?.text).toBe('Trip 2 note');
  });
});
