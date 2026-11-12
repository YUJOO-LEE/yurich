import type { Schema } from './schema';
import { isBlock } from './schema';
import { isList, keepTextSelection, renameElement, sameAttributes, unwrap } from './dom';

export const wrapLooseContent = (parent: Node, schema: Schema): HTMLElement[] => {
  const children = Array.from(parent.childNodes);
  const hasBlock = children.some(child => isBlock(child, schema));
  const created: HTMLElement[] = [];

  let run: Node[] = [];
  const flush = (): void => {
    if (run.length === 0) return;
    const hasContent = run.some(node => node.nodeType === Node.ELEMENT_NODE || node.textContent?.trim());
    // Whitespace between blocks is source formatting; whitespace on its own is what the user typed
    if (hasContent || !hasBlock) {
      const p = (parent.ownerDocument ?? document).createElement('p');
      parent.insertBefore(p, run[0]);
      p.append(...run);
      created.push(p);
    } else {
      run.forEach(node => parent.removeChild(node));
    }
    run = [];
  };

  for (const child of children) {
    if (isBlock(child, schema)) flush();
    else if (child.nodeType === Node.ELEMENT_NODE || child.nodeType === Node.TEXT_NODE) run.push(child);
    else parent.removeChild(child);
  }
  flush();

  return created;
};

const mergeFollowingLists = (list: Element): void => {
  let next = list.nextSibling;
  while (next instanceof Element && next.localName === list.localName) {
    list.append(...next.childNodes);
    next.remove();
    next = list.nextSibling;
  }
};

const normalizeList = (list: HTMLElement): void => {
  for (const child of Array.from(list.childNodes)) {
    if (child instanceof Element && child.localName === 'li') continue;
    if (child.nodeType === Node.TEXT_NODE && !child.textContent?.trim()) {
      child.remove();
      continue;
    }
    const li = list.ownerDocument.createElement('li');
    child.replaceWith(li);
    li.append(child);
  }

  if (list.children.length === 0) {
    list.remove();
    return;
  }
  mergeFollowingLists(list);
};

const normalizeBlock = (root: HTMLElement, block: Element, schema: Schema): void => {
  let top = block;

  for (const el of [block, ...block.querySelectorAll('*')]) {
    if (!root.contains(el)) continue;
    const tag = el.localName;
    if (tag === 'br') continue;

    const spec = schema.marks.get(tag) ?? schema.blocks.get(tag);
    if (!spec) {
      unwrap(el);
      continue;
    }

    const current = spec.tag === tag ? el : renameElement(el, spec.tag);
    if (el === top) top = current;

    if (schema.marks.has(tag)) {
      const outer = current.parentElement?.closest(spec.tag);
      if (current.childNodes.length === 0) current.remove();
      else if (outer && outer !== root && root.contains(outer)) unwrap(current);
    }
  }

  // Empty text nodes left by the edits above would keep neighbouring marks apart
  top.normalize();

  for (const el of Array.from(top.querySelectorAll('*'))) {
    if (!schema.marks.has(el.localName) || !root.contains(el)) continue;
    let next = el.nextSibling;
    while (next instanceof Element && next.localName === el.localName && sameAttributes(el, next)) {
      el.append(...next.childNodes);
      next.remove();
      next = el.nextSibling;
    }
  }
  top.normalize();

  for (const list of [top, ...top.querySelectorAll('ul, ol')]) {
    if (isList(list) && root.contains(list)) normalizeList(list);
  }
};

// The rules every edit may break: only blocks under the root, only schema tags, no mark nested in or next to itself, only items in lists
export const normalize = (root: HTMLElement, schema: Schema, dirty: Iterable<Node>): void => {
  keepTextSelection(() => {
    const blocks = new Set<Element>(wrapLooseContent(root, schema));
    for (const node of dirty) {
      if (node instanceof Element && node.parentNode === root) blocks.add(node);
    }

    for (const block of blocks) {
      if (block.parentNode === root) normalizeBlock(root, block, schema);
    }

    // A block removed between two lists leaves them adjacent without either being edited
    for (const child of Array.from(root.children)) {
      if (isList(child) && child.parentNode === root) mergeFollowingLists(child);
    }
  });
};
