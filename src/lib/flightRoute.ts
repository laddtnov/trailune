export function computeArcPath(
  from: { x: number; y: number },
  to: { x: number; y: number },
  curvature = 0.15
): string {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance === 0) {
    return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
  }

  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;

  // Perpendicular to the direction of travel, rotated 90° counterclockwise,
  // so every leg bows the same way regardless of travel direction.
  const perpX = -dy / distance;
  const perpY = dx / distance;

  const offset = curvature * distance;
  const controlX = midX + perpX * offset;
  const controlY = midY + perpY * offset;

  return `M ${from.x} ${from.y} Q ${controlX} ${controlY} ${to.x} ${to.y}`;
}
