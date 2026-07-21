import { describe, it, expect } from 'vitest';
import { padBBox } from './mapZoom';

describe('padBBox', () => {
  it('pads a bounding box by the given ratio on all sides', () => {
    const result = padBBox({ x: 100, y: 50, width: 200, height: 100 }, 0.2);
    expect(result).toEqual([60, 30, 280, 140]);
  });

  it('defaults to a 0.2 padding ratio when none is given', () => {
    const result = padBBox({ x: 0, y: 0, width: 100, height: 100 });
    expect(result).toEqual([-20, -20, 140, 140]);
  });

  it('handles a zero-size bbox without producing NaN', () => {
    const result = padBBox({ x: 10, y: 10, width: 0, height: 0 });
    expect(result).toEqual([10, 10, 0, 0]);
  });
});
