/** A selection end as [index of the top-level block, text offset inside it] */
type Position = [number, number];

export type SelectionPath = { anchor: Position; focus: Position };

export const getRange = (root: HTMLElement): Range | null => {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);
  return root.contains(range.commonAncestorContainer) ? range : null;
};

export const selectRange = (range: Range): void => {
  const sel = window.getSelection();
  if (!sel) return;
  sel.removeAllRanges();
  sel.addRange(range);
};

export const selectTextNodes = (first: Text, last: Text): void => {
  const range = document.createRange();
  range.setStart(first, 0);
  range.setEnd(last, last.length);
  selectRange(range);
};

export const collapseToEnd = (node: Node): void => {
  let deepest = node;
  while (deepest.lastChild) deepest = deepest.lastChild;

  const range = document.createRange();
  // A caret inside a text node survives normalization; one between elements does not
  if (deepest.nodeType === Node.TEXT_NODE) {
    range.setStart(deepest, (deepest as Text).length);
  } else if (deepest === node) {
    range.setStart(node, 0);
  } else {
    range.setStartAfter(deepest);
  }
  range.collapse(true);
  selectRange(range);
};

export const collapseInside = (block: Node): void => {
  let deepest = block;
  while (deepest.lastChild) deepest = deepest.lastChild;

  const sel = window.getSelection();
  if (deepest.nodeType === Node.TEXT_NODE) {
    sel?.collapse(deepest, (deepest as Text).length);
  } else if (deepest === block) {
    sel?.collapse(block, 0);
  } else {
    // In front of the placeholder <br>: behind it the next character would start a second line
    sel?.collapse(deepest.parentNode, Array.prototype.indexOf.call(deepest.parentNode!.childNodes, deepest));
  }
};

const toPosition = (root: HTMLElement, node: Node, offset: number): Position => {
  if (node === root) {
    return offset < root.childNodes.length ? [offset, 0] : [Math.max(offset - 1, 0), Infinity];
  }
  let top = node;
  while (top.parentNode !== root) top = top.parentNode!;

  const range = document.createRange();
  range.setStart(top, 0);
  range.setEnd(node, offset);
  return [Array.prototype.indexOf.call(root.childNodes, top), range.toString().length];
};

const fromPosition = (root: HTMLElement, [index, offset]: Position): [Node, number] => {
  const top = root.childNodes[Math.min(index, root.childNodes.length - 1)];
  if (!top) return [root, 0];

  const walker = document.createTreeWalker(top, NodeFilter.SHOW_TEXT);
  let remaining = offset;
  let last: Text | null = null;
  for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
    if (remaining <= node.length) return [node, remaining];
    remaining -= node.length;
    last = node;
  }
  return last ? [last, last.length] : [top, 0];
};

export const saveSelection = (root: HTMLElement): SelectionPath | null => {
  const sel = window.getSelection();
  if (!sel?.anchorNode || !sel.focusNode) return null;
  if (!root.contains(sel.anchorNode) || !root.contains(sel.focusNode)) return null;
  return {
    anchor: toPosition(root, sel.anchorNode, sel.anchorOffset),
    focus: toPosition(root, sel.focusNode, sel.focusOffset),
  };
};

export const restoreSelection = (root: HTMLElement, path: SelectionPath | null): void => {
  const sel = window.getSelection();
  if (!sel || !root.isConnected) return;
  if (!path) {
    collapseToEnd(root);
    return;
  }
  sel.setBaseAndExtent(...fromPosition(root, path.anchor), ...fromPosition(root, path.focus));
};
