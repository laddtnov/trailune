export interface Level {
	id: string;
	emoji: string;
	name: string;
	subtitle: string;
	min: number;
	max: number;
}

export const LEVELS: readonly Level[] = [
	{
		id: 'beginner',
		emoji: '🌱',
		name: 'Beginner',
		subtitle: 'Every great journey starts with a single destination.',
		min: 0,
		max: 2
	},
	{
		id: 'traveler',
		emoji: '🎒',
		name: 'Traveler',
		subtitle: "You're beginning to leave your footprints around the world.",
		min: 3,
		max: 9
	},
	{
		id: 'adventurer',
		emoji: '🧭',
		name: 'Adventurer',
		subtitle: 'Curiosity is taking you farther from home.',
		min: 10,
		max: 24
	},
	{
		id: 'wanderer',
		emoji: '🌍',
		name: 'Wanderer',
		subtitle: 'Your map is filling with unforgettable memories.',
		min: 25,
		max: 49
	},
	{
		id: 'voyager',
		emoji: '✈️',
		name: 'Voyager',
		subtitle: 'Airports are becoming familiar places.',
		min: 50,
		max: 99
	},
	{
		id: 'world-citizen',
		emoji: '🌎',
		name: 'World Citizen',
		subtitle: "You've experienced cultures across the globe.",
		min: 100,
		max: 174
	},
	{
		id: 'trailblazer',
		emoji: '👑',
		name: 'Trailblazer',
		subtitle: 'Few people have explored the world as extensively as you have.',
		min: 175,
		max: 211
	}
];

export interface LevelProgress {
	level: Level;
	countriesIntoLevel: number;
	levelWidth: number;
	percentToNext: number;
	countriesToNext: number | null;
	nextLevel: Level | null;
}

export function getLevelProgress(totalCountries: number): LevelProgress {
	const levelIndex = LEVELS.findIndex((l) => totalCountries >= l.min && totalCountries <= l.max);
	const level = levelIndex === -1 ? LEVELS.at(-1)! : LEVELS[levelIndex];
	const nextLevel =
		levelIndex === -1 || levelIndex === LEVELS.length - 1 ? null : LEVELS[levelIndex + 1];

	const countriesIntoLevel = totalCountries - level.min;

	if (!nextLevel) {
		return {
			level,
			countriesIntoLevel,
			levelWidth: level.max - level.min + 1,
			percentToNext: 100,
			countriesToNext: null,
			nextLevel: null
		};
	}

	const levelWidth = nextLevel.min - level.min;
	const percentToNext = Math.round((countriesIntoLevel / levelWidth) * 100);
	const countriesToNext = nextLevel.min - totalCountries;

	return { level, countriesIntoLevel, levelWidth, percentToNext, countriesToNext, nextLevel };
}
