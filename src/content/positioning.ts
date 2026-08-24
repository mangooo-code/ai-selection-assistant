export interface FloatingPosition { top: number; left: number }

export function positionNearSelection(rect: DOMRect, width: number, height: number, gap = 10): FloatingPosition {
  const padding = 12;
  const below = rect.bottom + gap;
  const above = rect.top - height - gap;
  const top = below + height <= window.innerHeight - padding ? below : Math.max(padding, above);
  const preferredLeft = rect.left + rect.width / 2 - width / 2;
  return { top, left: Math.min(Math.max(padding, preferredLeft), window.innerWidth - width - padding) };
}
