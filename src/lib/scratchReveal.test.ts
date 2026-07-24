import { describe, it, expect } from 'vitest';
import { SCRATCH_CLIP_KEYFRAMES } from './scratchReveal';

describe('SCRATCH_CLIP_KEYFRAMES', () => {
  it('has exactly 6 keyframes', () => {
    expect(SCRATCH_CLIP_KEYFRAMES).toHaveLength(6);
  });

  it('every keyframe is a valid polygon() string', () => {
    for (const [i, kf] of SCRATCH_CLIP_KEYFRAMES.entries()) {
      expect(kf, `keyframe ${i}`).toMatch(/^polygon\(.+\)$/);
    }
  });

  it('the first keyframe covers the full box (0%/100% extremes only)', () => {
    const first = SCRATCH_CLIP_KEYFRAMES[0];
    expect(first).toBe('polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)');
  });

  it('the last keyframe collapses to a single repeated point', () => {
    const last = SCRATCH_CLIP_KEYFRAMES[SCRATCH_CLIP_KEYFRAMES.length - 1];
    const points = last.slice('polygon('.length, -1).split(', ');
    expect(points.every((p) => p === points[0])).toBe(true);
  });
});
