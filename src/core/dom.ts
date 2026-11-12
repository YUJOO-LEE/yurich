export const renameElement = (el: Element, tag: string): HTMLElement => {
  const renamed = el.ownerDocument.createElement(tag);
  for (const attr of Array.from(el.attributes)) {
    renamed.setAttribute(attr.name, attr.value);
  }
  renamed.append(...el.childNodes);
  el.replaceWith(renamed);
  return renamed;
};

export const unwrap = (el: Element): void => {
  el.replaceWith(...el.childNodes);
};

export const isList = (node: Node | null): node is HTMLElement =>
  node instanceof HTMLElement && (node.localName === 'ul' || node.localName === 'ol');

export const sameAttributes = (a: Element, b: Element): boolean =>
  a.attributes.length === b.attributes.length &&
  Array.from(a.attributes).every(attr => b.getAttribute(attr.name) === attr.value);

// Moving a text node resets any selection boundary inside it, so put it back afterwards
export const keepTextSelection = (mutate: () => void): void => {
  const sel = window.getSelection();
  const anchor = sel?.anchorNode ?? null;
  const focus = sel?.focusNode ?? null;
  const anchorOffset = sel?.anchorOffset ?? 0;
  const focusOffset = sel?.focusOffset ?? 0;

  mutate();

  if (!sel || !anchor || !focus) return;
  if (anchor.nodeType !== Node.TEXT_NODE || focus.nodeType !== Node.TEXT_NODE) return;
  if (!anchor.isConnected || !focus.isConnected) return;
  if (
    sel.anchorNode === anchor && sel.anchorOffset === anchorOffset &&
    sel.focusNode === focus && sel.focusOffset === focusOffset
  ) return;
  sel.setBaseAndExtent(
    anchor, Math.min(anchorOffset, (anchor as Text).length),
    focus, Math.min(focusOffset, (focus as Text).length),
  );
};
