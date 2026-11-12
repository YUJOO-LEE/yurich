import type { Schema } from './schema';

// Their content is code or fallback markup, not text the author wrote, so it goes with the tag
const DROPPED_TAGS = new Set([
  'script', 'style', 'title', 'iframe', 'noscript', 'noembed', 'noframes',
  'plaintext', 'xmp', 'svg', 'math', 'audio', 'video',
]);

// Tags that start a new line in HTML. Outside the schema they still mark where a line ends.
const HTML_BLOCK_SELECTOR = [
  'address', 'article', 'aside', 'blockquote', 'dd', 'details', 'div', 'dl', 'dt', 'fieldset',
  'figcaption', 'figure', 'footer', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hr', 'li',
  'main', 'nav', 'ol', 'p', 'pre', 'section', 'summary', 'table', 'tbody', 'td', 'tfoot', 'th',
  'thead', 'tr', 'ul',
].join(',');

// A <form> exposes its controls as its own properties (<input name="tagName">), so nothing read from it can be trusted
export const readFormChildren = (form: HTMLFormElement): Node[] => {
  const contents = document.createRange();
  contents.selectNodeContents(form);
  return Array.from(contents.cloneContents().childNodes);
};

export const sanitizeStyle = (style: string | null, schema: Schema): string => {
  const kept: string[] = [];
  for (const declaration of (style ?? '').split(';')) {
    const colon = declaration.indexOf(':');
    if (colon === -1) continue;
    const property = declaration.slice(0, colon).trim().toLowerCase();
    const value = declaration.slice(colon + 1).trim().toLowerCase();
    if (schema.blockStyles.get(property)?.has(value)) kept.push(`${property}: ${value}`);
  }
  return kept.join('; ');
};

let outputDoc: Document | null = null;

const cleanChildren = (children: Iterable<Node>, parent: Node, schema: Schema): void => {
  for (const child of children) {
    const cleaned = cleanNode(child, schema);
    if (cleaned) parent.appendChild(cleaned);
  }
};

const cleanNode = (node: Node, schema: Schema): Node | null => {
  const doc = outputDoc!;
  const fragment = (children: Iterable<Node>): DocumentFragment => {
    const result = doc.createDocumentFragment();
    cleanChildren(children, result, schema);
    return result;
  };

  if (node instanceof HTMLFormElement) return fragment(readFormChildren(node));
  if (node.nodeType === Node.TEXT_NODE) return doc.createTextNode(node.textContent ?? '');
  if (!(node instanceof Element)) return null;

  const tag = node.localName;
  if (DROPPED_TAGS.has(tag)) return null;
  if (tag === 'br') return doc.createElement('br');

  const mark = schema.marks.get(tag);
  if (mark) {
    const el = doc.createElement(mark.tag);
    for (const [name, rule] of Object.entries(mark.attrs ?? {})) {
      const value = rule(node.getAttribute(name), node);
      if (value !== null) el.setAttribute(name, value);
    }
    cleanChildren(node.childNodes, el, schema);
    return el;
  }

  const isHtmlBlock = node.matches(HTML_BLOCK_SELECTOR);
  const holdsBlocks = node.querySelector(HTML_BLOCK_SELECTOR) !== null;
  const block = schema.blocks.get(tag);

  // A paragraph cannot contain blocks, and an unknown container is only a wrapper around them
  if ((block?.tag === 'p' || (!block && isHtmlBlock)) && holdsBlocks) return fragment(node.childNodes);

  if (block || isHtmlBlock) {
    const el = doc.createElement(block?.tag ?? 'p');
    const style = sanitizeStyle(node.getAttribute('style'), schema);
    if (style) el.setAttribute('style', style);
    cleanChildren(node.childNodes, el, schema);
    return block || el.childNodes.length > 0 ? el : null;
  }

  return fragment(node.childNodes);
};

export const sanitizeNodes = (nodes: Iterable<Node>, schema: Schema): string => {
  outputDoc ??= document.implementation.createHTMLDocument('');
  const container = outputDoc.createElement('div');
  cleanChildren(nodes, container, schema);
  return container.innerHTML;
};

export const sanitizeHTML = (html: string, schema: Schema): string => {
  if (!html) return '';
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  return sanitizeNodes(parsed.body.childNodes, schema);
};
