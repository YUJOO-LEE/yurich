import type { DocumentJSON, NodeJSON, MarkJSON } from '../core/types';

export const toJSON = (el: HTMLElement): DocumentJSON => {
  const content = parseBlockChildren(el);
  return { type: 'doc', content };
};

const getBlockType = (tag: string): string | null => {
  switch (tag) {
    case 'p':
    case 'div':
      return 'paragraph';
    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4':
    case 'h5':
    case 'h6':
      return 'heading';
    case 'blockquote':
      return 'blockquote';
    case 'pre':
      return 'codeBlock';
    case 'ul':
      return 'unorderedList';
    case 'ol':
      return 'orderedList';
    case 'li':
      return 'listItem';
    default:
      return null;
  }
};

const getMarkType = (tag: string): string | null => {
  switch (tag) {
    case 'b':
    case 'strong':
      return 'bold';
    case 'i':
    case 'em':
      return 'italic';
    case 'u':
      return 'underline';
    case 's':
    case 'del':
      return 'strikethrough';
    case 'code':
      return 'code';
    case 'a':
      return 'link';
    default:
      return null;
  }
};

const parseBlockChildren = (el: HTMLElement): NodeJSON[] => {
  const result: NodeJSON[] = [];

  el.childNodes.forEach(node => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? '';
      if (text.trim()) {
        result.push({ type: 'text', text });
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const childEl = node as HTMLElement;
      const tag = childEl.tagName.toLowerCase();

      if (tag === 'br') return;

      const markType = getMarkType(tag);
      if (markType) {
        // Inline element at block level — collect all inline nodes
        collectInlineNodes(childEl, [], result);
        return;
      }

      const blockType = getBlockType(tag);
      if (!blockType) return;

      const nodeJSON: NodeJSON = { type: blockType };

      if (blockType === 'heading') {
        const level = parseInt(tag.charAt(1), 10);
        nodeJSON.attrs = { level };
      }

      const children = parseMixedChildren(childEl);
      if (children.length > 0) {
        nodeJSON.content = children;
      }

      result.push(nodeJSON);
    }
  });

  return result;
};

const parseMixedChildren = (el: HTMLElement): NodeJSON[] => {
  const result: NodeJSON[] = [];

  el.childNodes.forEach(node => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? '';
      if (text) {
        result.push({ type: 'text', text });
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const childEl = node as HTMLElement;
      const tag = childEl.tagName.toLowerCase();

      if (tag === 'br') {
        result.push({ type: 'text', text: '\n' });
        return;
      }

      const markType = getMarkType(tag);
      if (markType) {
        collectInlineNodes(childEl, [], result);
        return;
      }

      const blockType = getBlockType(tag);
      if (blockType) {
        const nodeJSON: NodeJSON = { type: blockType };
        if (blockType === 'heading') {
          const level = parseInt(tag.charAt(1), 10);
          nodeJSON.attrs = { level };
        }
        const children = parseMixedChildren(childEl);
        if (children.length > 0) nodeJSON.content = children;
        result.push(nodeJSON);
      }
    }
  });

  return result;
};

const collectInlineNodes = (el: HTMLElement, parentMarks: MarkJSON[], result: NodeJSON[]): void => {
  const tag = el.tagName.toLowerCase();
  const markType = getMarkType(tag);

  if (!markType) {
    // Not a mark element, just collect text
    const text = el.textContent ?? '';
    if (text) {
      const node: NodeJSON = { type: 'text', text };
      if (parentMarks.length > 0) node.marks = [...parentMarks];
      result.push(node);
    }
    return;
  }

  const currentMark: MarkJSON = { type: markType };
  if (tag === 'a') {
    const href = el.getAttribute('href');
    currentMark.attrs = { href: href ?? '' };
  }

  const marks: MarkJSON[] = [...parentMarks, currentMark];

  el.childNodes.forEach(child => {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent ?? '';
      if (text) {
        const node: NodeJSON = { type: 'text', text };
        if (marks.length > 0) node.marks = marks;
        result.push(node);
      }
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      collectInlineNodes(child as HTMLElement, marks, result);
    }
  });
};
