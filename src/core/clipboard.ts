import type { Schema } from './schema';
import { isBlock } from './schema';
import { unwrap } from './dom';
import { wrapLooseContent } from './normalize';
import { collapseToEnd } from './selection';

const insertInline = (range: Range, fragment: DocumentFragment): void => {
  range.deleteContents();

  const last = fragment.lastChild;
  range.insertNode(fragment);
  if (!last) return;

  // The browser's <br> that kept the empty line open is stale once content precedes it
  const next = last.nextSibling;
  if (next?.nodeName === 'BR' && !next.nextSibling) next.remove();

  collapseToEnd(last);
};

// Blocks cannot live inside the block being edited, so split it at the caret and put them in between
const insertBlocks = (root: HTMLElement, range: Range, fragment: DocumentFragment, schema: Schema): void => {
  range.deleteContents();

  let top: Node | null = range.startContainer;
  while (top && top !== root && top.parentNode !== root) top = top.parentNode;
  if (!top || top === root || !isBlock(top, schema)) {
    insertInline(range, fragment);
    return;
  }

  wrapLooseContent(fragment, schema);
  const last = fragment.lastChild;
  if (!last) return;

  const tailRange = document.createRange();
  tailRange.selectNodeContents(top);
  tailRange.setStart(range.startContainer, range.startOffset);
  const tail = top.cloneNode(false) as HTMLElement;
  tail.append(tailRange.extractContents());

  top.after(fragment, tail);
  for (const part of [top, tail]) {
    if (!part.textContent?.trim()) part.remove();
  }

  collapseToEnd(last);
};

// `html` must already be sanitized
export const insertHTML = (root: HTMLElement, range: Range, html: string, schema: Schema): void => {
  const template = document.createElement('template');
  template.innerHTML = html;
  const fragment = template.content;

  // A single copied paragraph is meant to join the current line, not split it
  const only = fragment.childNodes.length === 1 ? fragment.firstChild : null;
  if (only instanceof HTMLElement && only.localName === 'p' && !only.querySelector(schema.blockSelector)) {
    unwrap(only);
  }

  if (fragment.querySelector(schema.blockSelector)) insertBlocks(root, range, fragment, schema);
  else insertInline(range, fragment);
};

export const insertText = (root: HTMLElement, range: Range, text: string): void => {
  const fragment = document.createDocumentFragment();
  const start = range.startContainer;
  const inPre = (start instanceof Element ? start : start.parentElement)?.closest('pre');

  if (inPre && root.contains(inPre)) {
    fragment.append(text);
  } else {
    // Outside <pre> a raw newline renders as a space
    text.split(/\r\n?|\n/).forEach((line, index) => {
      if (index > 0) fragment.append(document.createElement('br'));
      if (line) fragment.append(line);
    });
  }

  insertInline(range, fragment);
};
