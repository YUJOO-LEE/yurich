import type { Schema } from './schema';
import { isBlock } from './schema';
import { isList, keepTextSelection, renameElement } from './dom';
import { collapseInside, getRange } from './selection';

const isTextBlock = (node: Node, schema: Schema): node is HTMLElement =>
  isBlock(node, schema) && !isList(node);

const innermostBlock = (node: Node, root: HTMLElement, schema: Schema): HTMLElement | null => {
  for (let current: Node | null = node; current && current !== root; current = current.parentNode) {
    if (isTextBlock(current, schema)) return current;
  }
  return null;
};

const hasSelectedText = (range: Range, block: HTMLElement): boolean => {
  const inside = document.createRange();
  inside.selectNodeContents(block);
  if (range.compareBoundaryPoints(Range.START_TO_START, inside) > 0) {
    inside.setStart(range.startContainer, range.startOffset);
  }
  if (range.compareBoundaryPoints(Range.END_TO_END, inside) < 0) {
    inside.setEnd(range.endContainer, range.endOffset);
  }
  return inside.toString() !== '';
};

export const selectedBlocks = (root: HTMLElement, range: Range, schema: Schema): HTMLElement[] => {
  const boundary = (container: Node, offset: number): Node =>
    container.childNodes[offset] ?? container.lastChild ?? container;
  const first = innermostBlock(boundary(range.startContainer, range.startOffset), root, schema);
  const last = innermostBlock(boundary(range.endContainer, range.endOffset), root, schema);
  if (!first) return [];
  if (!last || first === last) return [first];

  const blocks = Array.from(root.querySelectorAll<HTMLElement>(schema.blockSelector)).filter(el =>
    isTextBlock(el, schema) && !el.querySelector(schema.blockSelector) && range.intersectsNode(el));

  // Triple-click ends the selection at offset 0 of the next block; that block is not selected
  if (blocks.length > 1 && !hasSelectedText(range, blocks[blocks.length - 1])) blocks.pop();
  return blocks;
};

// An empty editor has no block for a block command to act on, so it gets one first
export const blockRange = (root: HTMLElement): Range | null => {
  if (!getRange(root)) return null;
  if (root.childNodes.length === 0) {
    const p = document.createElement('p');
    p.append(document.createElement('br'));
    root.append(p);
    window.getSelection()?.collapse(p, 0);
  }
  return getRange(root);
};

export const withBlockSelection = (root: HTMLElement, edit: () => HTMLElement | null): void => {
  let last: HTMLElement | null = null;
  keepTextSelection(() => {
    last = edit();
  });
  // Replacing the block the caret was in leaves the selection on the root, between blocks
  const range = getRange(root);
  if (last && (!range || range.startContainer === root)) collapseInside(last);
};

export const liftListItem = (item: HTMLElement, tag: string): HTMLElement => {
  const list = item.parentElement;
  if (!isList(list)) return renameElement(item, tag);

  const rest = list.cloneNode(false) as HTMLElement;
  while (item.nextSibling) rest.append(item.nextSibling);
  list.after(item);
  if (rest.childNodes.length > 0) item.after(rest);
  if (list.childNodes.length === 0) list.remove();
  return renameElement(item, tag);
};

export const setBlock = (root: HTMLElement, schema: Schema, tag: string): void => {
  const spec = schema.blocks.get(tag);
  if (!spec || spec.tag !== tag || tag === 'li' || tag === 'ul' || tag === 'ol') return;

  const range = blockRange(root);
  if (!range) return;
  const blocks = selectedBlocks(root, range, schema);

  withBlockSelection(root, () => {
    let last: HTMLElement | null = null;
    for (const block of blocks) {
      if (block.localName === tag) last = block;
      else last = block.localName === 'li' ? liftListItem(block, tag) : renameElement(block, tag);
    }
    return last;
  });
};

export const isBlockActive = (root: HTMLElement, schema: Schema, tag: string): boolean => {
  const range = getRange(root);
  if (!range) return false;
  const blocks = selectedBlocks(root, range, schema);
  return blocks.length > 0 && blocks.every(block => block.localName === tag);
};

export const setBlockStyle = (root: HTMLElement, schema: Schema, property: string, value: string): void => {
  if (!schema.blockStyles.get(property)?.has(value)) return;

  const range = blockRange(root);
  if (!range) return;
  for (const block of selectedBlocks(root, range, schema)) {
    block.style.setProperty(property, value);
  }
};

export const getBlockStyle = (root: HTMLElement, schema: Schema, property: string): string | null => {
  const range = getRange(root);
  if (!range) return null;
  const [block] = selectedBlocks(root, range, schema);
  return block?.style.getPropertyValue(property) || null;
};
