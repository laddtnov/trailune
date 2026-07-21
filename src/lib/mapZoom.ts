export type ViewBox = [number, number, number, number];

export function padBBox(
  bbox: { x: number; y: number; width: number; height: number },
  paddingRatio = 0.2
): ViewBox {
  const padX = bbox.width * paddingRatio;
  const padY = bbox.height * paddingRatio;
  return [bbox.x - padX, bbox.y - padY, bbox.width + padX * 2, bbox.height + padY * 2];
}
