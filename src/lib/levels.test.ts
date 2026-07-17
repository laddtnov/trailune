import { describe, it, expect } from 'vitest';
import { getLevelProgress, LEVELS } from './levels';

describe('LEVELS', () => {
	it('has exactly 7 tiers with the correct ids in order', () => {
		expect(LEVELS.map((l) => l.id)).toEqual([
			'beginner',
			'traveler',
			'adventurer',
			'wanderer',
			'voyager',
			'world-citizen',
			'trailblazer'
		]);
	});
});

describe('getLevelProgress', () => {
	it('places 0 countries in beginner, 3 countries until traveler', () => {
		const progress = getLevelProgress(0);
		expect(progress.level.id).toBe('beginner');
		expect(progress.percentToNext).toBe(0);
		expect(progress.countriesToNext).toBe(3);
		expect(progress.nextLevel?.id).toBe('traveler');
	});

	it('boundary: 2 countries is still beginner, 3 is traveler', () => {
		expect(getLevelProgress(2).level.id).toBe('beginner');
		expect(getLevelProgress(3).level.id).toBe('traveler');
	});

	it('boundary: 9 countries is still traveler, 10 is adventurer', () => {
		expect(getLevelProgress(9).level.id).toBe('traveler');
		expect(getLevelProgress(10).level.id).toBe('adventurer');
	});

	it('boundary: 24 countries is still adventurer, 25 is wanderer', () => {
		expect(getLevelProgress(24).level.id).toBe('adventurer');
		expect(getLevelProgress(25).level.id).toBe('wanderer');
	});

	it('boundary: 49 countries is still wanderer, 50 is voyager', () => {
		expect(getLevelProgress(49).level.id).toBe('wanderer');
		expect(getLevelProgress(50).level.id).toBe('voyager');
	});

	it('boundary: 99 countries is still voyager, 100 is world-citizen', () => {
		expect(getLevelProgress(99).level.id).toBe('voyager');
		expect(getLevelProgress(100).level.id).toBe('world-citizen');
	});

	it('boundary: 174 countries is still world-citizen, 175 is trailblazer', () => {
		expect(getLevelProgress(174).level.id).toBe('world-citizen');
		expect(getLevelProgress(175).level.id).toBe('trailblazer');
	});

	it('computes band-relative percent and countdown mid-tier', () => {
		const progress = getLevelProgress(15); // adventurer: 10-24, width 15, next wanderer at 25
		expect(progress.level.id).toBe('adventurer');
		expect(progress.countriesIntoLevel).toBe(5);
		expect(progress.levelWidth).toBe(15);
		expect(progress.percentToNext).toBe(33); // round(5/15*100)
		expect(progress.countriesToNext).toBe(10);
		expect(progress.nextLevel?.id).toBe('wanderer');
	});

	it('reports the top tier with no next level, full bar, no countdown', () => {
		const atThreshold = getLevelProgress(175);
		expect(atThreshold.level.id).toBe('trailblazer');
		expect(atThreshold.percentToNext).toBe(100);
		expect(atThreshold.countriesToNext).toBeNull();
		expect(atThreshold.nextLevel).toBeNull();

		const atMax = getLevelProgress(211);
		expect(atMax.level.id).toBe('trailblazer');
		expect(atMax.percentToNext).toBe(100);
		expect(atMax.countriesToNext).toBeNull();
		expect(atMax.nextLevel).toBeNull();
	});
});
