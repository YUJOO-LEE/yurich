import type { MarkSpec } from './types';
import { isList, keepTextSelection, unwrap } from './dom';
import { selectTextNodes } from './selection';

type Piece = { node: Text; start: number; end: number };

const closestMark = (node: Node, spec: MarkSpec, root: HTMLElement): HTMLElement | null => {
  for (let current: Node | null = node; current && current !== root; current = current.parentNode) {
    if (!(current instanceof HTMLElement)) continue;
    if (current.localName === spec.tag || spec.aliases?.includes(current.localName)) return current;
  }
  return null;
};

const piecesIn = (root: HTMLElement, range: Range): Piece[] => {
  const ancestor = range.commonAncestorContainer;
  const scope = ancestor.nodeType === Node.TEXT_NODE ? ancestor.parentNode! : ancestor;
  const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
  const pieces: Piece[] = [];

  for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
    if (!range.intersectsNode(node)) continue;
    // Text directly under the root or a list is whitespace between blocks, not content
    if (node.parentNode === root || isList(node.parentNode)) continue;

    const start = node === range.startContainer ? range.startOffset : 0;
    const end = node === range.endContainer ? range.endOffset : node.length;
    if (start < end) pieces.push({ node, start, end });
  }
  return pieces;
};

const isolate = (pieces: Piece[]): Text[] =>
  pieces.map(({ node, start, end }) => {
    if (end < node.length) node.splitText(end);
    return start > 0 ? node.splitText(start) : node;
  });

const setAttributes = (el: Element, attrs?: Record<string, string>): void => {
  for (const [name, value] of Object.entries(attrs ?? {})) el.setAttribute(name, value);
};

export const isMarkActive = (root: HTMLElement, range: Range, spec: MarkSpec): boolean => {
  if (range.collapsed) return closestMark(range.startContainer, spec, root) !== null;
  const pieces = piecesIn(root, range);
  return pieces.length > 0 && pieces.every(piece => closestMark(piece.node, spec, root));
};

export const applyMark = (
  root: HTMLElement,
  range: Range,
  spec: MarkSpec,
  attrs?: Record<string, string>,
  text?: string,
): void => {
  if (range.collapsed) {
    if (!text) return;
    range.insertNode(document.createTextNode(text));
  }

  const targets = isolate(piecesIn(root, range));
  if (targets.length === 0) return;

  for (const target of targets) {
    const existing = closestMark(target, spec, root);
    if (existing) {
      setAttributes(existing, attrs);
      continue;
    }
    const wrapper = document.createElement(spec.tag);
    setAttributes(wrapper, attrs);
    target.replaceWith(wrapper);
    wrapper.append(target);
  }

  selectTextNodes(targets[0], targets[targets.length - 1]);
};

const liftOut = (mark: HTMLElement, target: Text): void => {
  const before = document.createRange();
  before.setStart(mark, 0);
  before.setEndBefore(target);
  const after = document.createRange();
  after.setStartAfter(target);
  after.setEnd(mark, mark.childNodes.length);

  for (const [part, place] of [[before, 'before'], [after, 'after']] as const) {
    const content = part.extractContents();
    if (!content.textContent && !content.querySelector('br')) continue;
    const clone = mark.cloneNode(false) as HTMLElement;
    clone.append(content);
    mark[place](clone);
  }
  unwrap(mark);
};

export const removeMark = (root: HTMLElement, range: Range, spec: MarkSpec): void => {
  if (range.collapsed) {
    const mark = closestMark(range.startContainer, spec, root);
    if (mark) keepTextSelection(() => unwrap(mark));
    return;
  }

  const targets = isolate(piecesIn(root, range));
  if (targets.length === 0) return;

  for (const target of targets) {
    for (let mark = closestMark(target, spec, root); mark; mark = closestMark(target, spec, root)) {
      liftOut(mark, target);
    }
  }

  selectTextNodes(targets[0], targets[targets.length - 1]);
};

export const toggleMark = (root: HTMLElement, range: Range, spec: MarkSpec): void => {
  if (range.collapsed) return;
  if (isMarkActive(root, range, spec)) removeMark(root, range, spec);
  else applyMark(root, range, spec);
};
