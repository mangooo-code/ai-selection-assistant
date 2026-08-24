export const MIN_SELECTION_LENGTH = 2;

export interface ValidSelection {
  text: string;
  rect: DOMRect;
  context: string;
}

export function readSelection(): ValidSelection | null {
  const selection = window.getSelection();
  const rawText = selection?.toString() ?? "";
  const text = rawText.replace(/[\u200B-\u200D\uFEFF]/g, "").replace(/\s+/g, " ").trim();
  if (text.length < MIN_SELECTION_LENGTH || !selection?.rangeCount) return null;
  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  if (!rect.width && !rect.height) return null;
  const parentText = range.commonAncestorContainer.parentElement?.innerText ?? "";
  return { text, rect, context: parentText.slice(0, 1200) };
}
