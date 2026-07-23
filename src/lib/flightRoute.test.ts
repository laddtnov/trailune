import { describe, it, expect } from 'vitest';
import { computeArcPath } from './flightRoute';

function parseQuadratic(d: string) {
  const match = d.match(
    /^M ([\d.-]+) ([\d.-]+) Q ([\d.-]+) ([\d.-]+) ([\d.-]+) ([\d.-]+)$/
  );
  if (!match) throw new Error(`path did not match expected format: ${d}`);
  const [, mx, my, cx, cy, ex, ey] = match.map(Number) as unknown as number[];
  return { start: { x: mx, y: my }, control: { x: cx, y: cy }, end: { x: ex, y: ey } };
}

describe('computeArcPath', () => {
  it('returns a well-formed single quadratic-bezier path string', () => {
    const d = computeArcPath({ x: 0, y: 0 }, { x: 10, y: 0 });
    expect(() => parseQuadratic(d)).not.toThrow();
  });

  it('starts and ends exactly at the given points', () => {
    const d = computeArcPath({ x: 0, y: 0 }, { x: 10, y: 0 });
    const { start, end } = parseQuadratic(d);
    expect(start).toEqual({ x: 0, y: 0 });
    expect(end).toEqual({ x: 10, y: 0 });
  });

  it('offsets the control point perpendicular to the line by curvature * distance', () => {
    const d = computeArcPath({ x: 0, y: 0 }, { x: 10, y: 0 }, 0.15);
    const { control } = parseQuadratic(d);
    // Straight horizontal line, midpoint (5, 0); perpendicular offset is purely vertical.
    expect(control.x).toBeCloseTo(5, 5);
    expect(Math.abs(control.y)).toBeCloseTo(1.5, 5);
  });

  it('bows to the geometrically opposite side when the endpoints are reversed', () => {
    const forward = parseQuadratic(computeArcPath({ x: 0, y: 0 }, { x: 10, y: 0 }, 0.15));
    const reversed = parseQuadratic(computeArcPath({ x: 10, y: 0 }, { x: 0, y: 0 }, 0.15));
    expect(forward.control.y).toBeCloseTo(-reversed.control.y, 5);
  });

  it('falls back to a degenerate straight path when from and to coincide', () => {
    const d = computeArcPath({ x: 5, y: 5 }, { x: 5, y: 5 });
    expect(d).toBe('M 5 5 L 5 5');
  });
});
