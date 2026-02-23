const TAG_REPLACEMENTS: Record<string, string> = {
  B: 'STRONG',
  I: 'EM',
};

const INLINE_TAGS = new Set(['STRONG', 'EM', 'U', 'S', 'DEL', 'CODE', 'SPAN', 'A', 'B', 'I']);

const replaceDeprecatedTags = (el: HTMLElement): void => {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_ELEMENT);
  const toReplace: { old: Element; newTag: string }[] = [];

  let current = walker.nextNode();
  while (current) {
    const element = current as Element;
    const replacement = TAG_REPLACEMENTS[element.tagName];
    if (replacement) {
      toReplace.push({ old: element, newTag: replacement });
    }
    current = walker.nextNode();
  }

  for (const { old, newTag } of toReplace) {
    const newEl = document.createElement(newTag);
    // Copy attributes
    for (let i = 0; i < old.attributes.length; i++) {
      const attr = old.attributes[i];
      newEl.setAttribute(attr.name, attr.value);
    }
    // Move children
    while (old.firstChild) {
      newEl.appendChild(old.firstChild);
    }
    old.parentNode?.replaceChild(newEl, old);
  }
};

const mergeAdjacentInlines = (el: HTMLElement): void => {
  let changed = true;
  while (changed) {
    changed = false;
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_ELEMENT);
    let current = walker.nextNode();
    while (current) {
      const element = current as Element;
      const next = element.nextSibling;

      if (
        next &&
        next.nodeType === Node.ELEMENT_NODE &&
        INLINE_TAGS.has(element.tagName) &&
        element.tagName === (next as Element).tagName &&
        attributesMatch(element, next as Element)
      ) {
        // Merge next into current
        while (next.firstChild) {
          element.appendChild(next.firstChild);
        }
        next.parentNode?.removeChild(next);
        changed = true;
        break; // Restart walk since DOM mutated
      }

      current = walker.nextNode();
    }
  }
};

const attributesMatch = (a: Element, b: Element): boolean => {
  if (a.attributes.length !== b.attributes.length) return false;
  for (let i = 0; i < a.attributes.length; i++) {
    const attr = a.attributes[i];
    if (b.getAttribute(attr.name) !== attr.value) return false;
  }
  return true;
};

const removeEmptyTextNodes = (el: HTMLElement): void => {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const toRemove: Node[] = [];

  let current = walker.nextNode();
  while (current) {
    if (current.textContent === '') {
      toRemove.push(current);
    }
    current = walker.nextNode();
  }

  for (const node of toRemove) {
    node.parentNode?.removeChild(node);
  }
};

export const normalizeHTML = (el: HTMLElement): void => {
  replaceDeprecatedTags(el);
  mergeAdjacentInlines(el);
  removeEmptyTextNodes(el);
};
