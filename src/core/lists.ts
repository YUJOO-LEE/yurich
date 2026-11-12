import type { Schema } from './schema';
import { blockRange, liftListItem, selectedBlocks, withBlockSelection } from './blocks';
import { getRange } from './selection';

type ListTag = 'ol' | 'ul';

const isItemOf = (block: HTMLElement, tag: ListTag): boolean =>
  block.localName === 'li' && block.parentElement?.localName === tag;

export const isListActive = (root: HTMLElement, schema: Schema, tag: ListTag): boolean => {
  const range = getRange(root);
  if (!range) return false;
  const blocks = selectedBlocks(root, range, schema);
  return blocks.length > 0 && blocks.every(block => isItemOf(block, tag));
};

// Each block becomes a list of its own; normalization joins the neighbours into one
const wrapInList = (block: HTMLElement, tag: ListTag): HTMLElement => {
  const list = document.createElement(tag);
  const item = document.createElement('li');
  const style = block.getAttribute('style');
  if (style) item.setAttribute('style', style);

  item.append(...block.childNodes);
  list.append(item);
  block.replaceWith(list);
  return item;
};

export const toggleList = (root: HTMLElement, schema: Schema, tag: ListTag): void => {
  if (!schema.blocks.has(tag)) return;

  const range = blockRange(root);
  if (!range) return;
  const blocks = selectedBlocks(root, range, schema);
  const turnOff = blocks.every(block => isItemOf(block, tag));

  withBlockSelection(root, () => {
    let last: HTMLElement | null = null;
    for (const block of blocks) {
      if (turnOff) last = liftListItem(block, 'p');
      else if (isItemOf(block, tag)) last = block;
      else last = wrapInList(block.localName === 'li' ? liftListItem(block, 'p') : block, tag);
    }
    return last;
  });
};
