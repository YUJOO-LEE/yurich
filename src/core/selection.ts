const getSelectionWithRange = (): { sel: Selection; range: Range } | null => {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);
  const node = range.startContainer;
  const el = node.nodeType === Node.ELEMENT_NODE ? node as Element : node.parentElement;
  if (!el?.closest('[contenteditable="true"]')) return null;
  return { sel, range };
};

export const saveSelection = (): Range | null => {
  const ctx = getSelectionWithRange();
  if (!ctx) return null;
  return ctx.range.cloneRange();
};

export const restoreSelection = (range: Range): void => {
  const sel = window.getSelection();
  if (!sel) return;
  sel.removeAllRanges();
  sel.addRange(range);
};

export const isWithinTag = (tagName: string): boolean => {
  const ctx = getSelectionWithRange();
  if (!ctx) return false;

  const upperTag = tagName.toUpperCase();
  let node: Node | null = ctx.range.commonAncestorContainer;

  while (node) {
    if (
      node.nodeType === Node.ELEMENT_NODE &&
      (node as Element).tagName === upperTag
    ) {
      return true;
    }
    node = node.parentNode;
  }

  return false;
};

export const wrapSelection = (
  tagName: string,
  attrs?: Record<string, string>,
): void => {
  const ctx = getSelectionWithRange();
  if (!ctx) return;

  const { sel, range } = ctx;
  const wrapper = document.createElement(tagName);

  if (attrs) {
    for (const [key, value] of Object.entries(attrs)) {
      wrapper.setAttribute(key, value);
    }
  }

  try {
    range.surroundContents(wrapper);
  } catch {
    // If surroundContents fails (partial selection across elements),
    // extract and wrap the contents
    const fragment = range.extractContents();
    wrapper.appendChild(fragment);
    range.insertNode(wrapper);
  }

  // Restore selection to wrapper contents
  sel.removeAllRanges();
  const newRange = document.createRange();
  newRange.selectNodeContents(wrapper);
  sel.addRange(newRange);
};

export const unwrapSelection = (tagName: string): void => {
  const ctx = getSelectionWithRange();
  if (!ctx) return;

  const upperTag = tagName.toUpperCase();
  let node: Node | null = ctx.range.commonAncestorContainer;

  // Find the wrapping element
  while (node) {
    if (
      node.nodeType === Node.ELEMENT_NODE &&
      (node as Element).tagName === upperTag
    ) {
      const parent = node.parentNode;
      if (!parent) return;

      // Move all children out before the wrapper
      const savedRange = saveSelection();
      while (node.firstChild) {
        parent.insertBefore(node.firstChild, node);
      }
      parent.removeChild(node);

      if (savedRange) {
        restoreSelection(savedRange);
      }
      return;
    }
    node = node.parentNode;
  }
};

const BLOCK_TAGS = new Set([
  'P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
  'BLOCKQUOTE', 'PRE', 'LI', 'OL', 'UL',
]);

export const getClosestBlock = (node: Node): HTMLElement | null => {
  let current: Node | null = node;
  while (current) {
    if (
      current.nodeType === Node.ELEMENT_NODE &&
      BLOCK_TAGS.has((current as HTMLElement).tagName)
    ) {
      const el = current as HTMLElement;
      // Don't return the contenteditable root
      if (el.getAttribute('contenteditable') === 'true') return null;
      return el;
    }
    current = current.parentNode;
  }
  return null;
};

export const setBlockTag = (tagName: string): void => {
  const ctx = getSelectionWithRange();
  if (!ctx) return;

  const { sel, range } = ctx;
  const block = getClosestBlock(range.startContainer);
  if (!block || !block.parentNode) return;

  const newBlock = document.createElement(tagName);

  // Preserve attributes (including style)
  for (const attr of Array.from(block.attributes)) {
    newBlock.setAttribute(attr.name, attr.value);
  }

  // Move children
  while (block.firstChild) {
    newBlock.appendChild(block.firstChild);
  }

  block.parentNode.replaceChild(newBlock, block);

  // Restore cursor inside the new block
  const newRange = document.createRange();
  newRange.selectNodeContents(newBlock);
  newRange.collapse(false);
  sel.removeAllRanges();
  sel.addRange(newRange);
};

export const toggleList = (listTag: 'ol' | 'ul'): void => {
  const ctx = getSelectionWithRange();
  if (!ctx) return;

  const { sel, range } = ctx;
  const upperTag = listTag.toUpperCase();

  // Check if already in a list
  let listNode: HTMLElement | null = null;
  let node: Node | null = range.startContainer;
  while (node) {
    if (
      node.nodeType === Node.ELEMENT_NODE &&
      ((node as HTMLElement).tagName === 'OL' || (node as HTMLElement).tagName === 'UL')
    ) {
      listNode = node as HTMLElement;
      break;
    }
    node = node.parentNode;
  }

  if (listNode) {
    if (listNode.tagName === upperTag) {
      // Same list type — unwrap: convert all children to <p>
      const parent = listNode.parentNode;
      if (!parent) return;
      let lastInserted: HTMLElement | null = null;

      // Process all child nodes, not just <li>
      const children = Array.from(listNode.childNodes);
      for (const child of children) {
        const p = document.createElement('p');
        if (child.nodeType === Node.ELEMENT_NODE && (child as HTMLElement).tagName === 'LI') {
          while (child.firstChild) p.appendChild(child.firstChild);
        } else {
          p.appendChild(child);
        }
        // Skip empty paragraphs but never lose content
        if (p.textContent || p.querySelector('*')) {
          parent.insertBefore(p, listNode);
          lastInserted = p;
        }
      }

      // Fallback: if nothing was extracted, create empty <p>
      if (!lastInserted) {
        const p = document.createElement('p');
        p.appendChild(document.createElement('br'));
        parent.insertBefore(p, listNode);
        lastInserted = p;
      }

      parent.removeChild(listNode);

      // Restore cursor
      const newRange = document.createRange();
      newRange.selectNodeContents(lastInserted);
      newRange.collapse(false);
      sel.removeAllRanges();
      sel.addRange(newRange);
    } else {
      // Different list type — swap wrapper tag
      const parent = listNode.parentNode;
      if (!parent) return;
      const newList = document.createElement(listTag);
      for (const attr of Array.from(listNode.attributes)) {
        newList.setAttribute(attr.name, attr.value);
      }
      while (listNode.firstChild) {
        newList.appendChild(listNode.firstChild);
      }
      parent.replaceChild(newList, listNode);

      const newRange = document.createRange();
      newRange.selectNodeContents(newList);
      newRange.collapse(false);
      sel.removeAllRanges();
      sel.addRange(newRange);
    }
  } else {
    // Not in a list — wrap current block in <listTag><li>...</li></listTag>
    const block = getClosestBlock(range.startContainer);
    if (!block || !block.parentNode) return;

    const list = document.createElement(listTag);
    const li = document.createElement('li');

    while (block.firstChild) {
      li.appendChild(block.firstChild);
    }
    list.appendChild(li);
    block.parentNode.replaceChild(list, block);

    const newRange = document.createRange();
    newRange.selectNodeContents(li);
    newRange.collapse(false);
    sel.removeAllRanges();
    sel.addRange(newRange);
  }
};

export const setBlockStyle = (property: string, value: string): void => {
  const ctx = getSelectionWithRange();
  if (!ctx) return;

  const block = getClosestBlock(ctx.range.startContainer);
  if (!block) return;

  // camelCase → kebab-case: textAlign → text-align
  const kebab = property.replace(/[A-Z]/g, m => '-' + m.toLowerCase());
  block.style.setProperty(kebab, value);
};

export const insertHTMLAtCursor = (html: string): void => {
  const ctx = getSelectionWithRange();
  if (!ctx) return;

  const { sel, range } = ctx;
  range.deleteContents();

  const temp = document.createElement('template');
  temp.innerHTML = html;
  const fragment = temp.content;

  // Track last inserted node for cursor placement
  const lastNode = fragment.lastChild;
  range.insertNode(fragment);

  // Move cursor to end of inserted content
  if (lastNode) {
    const newRange = document.createRange();
    newRange.setStartAfter(lastNode);
    newRange.collapse(true);
    sel.removeAllRanges();
    sel.addRange(newRange);
  }
};
