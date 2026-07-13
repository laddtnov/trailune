import { describe, it, expect } from 'vitest';
import { computeThumbnailDimensions } from './image';

describe('computeThumbnailDimensions', () => {
  it('leaves images already within the max dimension unchanged', () => {
    expect(computeThumbnailDimensions(200, 100, 400)).toEqual({ width: 200, height: 100 });
  });

  it('scales down a wide image to fit the max dimension', () => {
    expect(computeThumbnailDimensions(800, 400, 400)).toEqual({ width: 400, height: 200 });
  });

  it('scales down a tall image to fit the max dimension', () => {
    expect(computeThumbnailDimensions(400, 800, 400)).toEqual({ width: 200, height: 400 });
  });
});
