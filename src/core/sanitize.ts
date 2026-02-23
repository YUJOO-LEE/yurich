const ALLOWED_TAGS = new Set([
  'p', 'br', 'b', 'strong', 'i', 'em', 'u', 's', 'del',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'a', 'blockquote', 'code', 'pre', 'div', 'span',
]);

const TAGS_WITH_STYLE = new Set([
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'div', 'p',
]);

const VALID_TEXT_ALIGN = new Set(['left', 'center', 'right', 'justify']);

const isAllowedHref = (href: string): boolean => {
  return (
    href.startsWith('http://') ||
    href.startsWith('https://') ||
    href.startsWith('mailto:')
  );
};

const sanitizeStyle = (value: string): string => {
  const parts = value.split(';');
  const allowed: string[] = [];
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) continue;
    const prop = trimmed.slice(0, colonIdx).trim().toLowerCase();
    const val = trimmed.slice(colonIdx + 1).trim().toLowerCase();
    if (prop === 'text-align' && VALID_TEXT_ALIGN.has(val)) {
      allowed.push(`text-align: ${val}`);
    }
  }
  return allowed.join('; ');
};

const cleanNode = (node: Node, doc: Document): Node | null => {
  if (node.nodeType === Node.TEXT_NODE) {
    return doc.createTextNode(node.textContent ?? '');
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null;
  }

  const el = node as Element;
  const tagName = el.tagName.toLowerCase();

  if (!ALLOWED_TAGS.has(tagName)) {
    // Unwrap: process children and return them in a fragment
    const fragment = doc.createDocumentFragment();
    for (let i = 0; i < el.childNodes.length; i++) {
      const cleaned = cleanNode(el.childNodes[i], doc);
      if (cleaned) {
        fragment.appendChild(cleaned);
      }
    }
    return fragment;
  }

  const newEl = doc.createElement(tagName);

  // Apply allowed attributes
  if (tagName === 'a') {
    const href = el.getAttribute('href');
    if (href && isAllowedHref(href)) {
      newEl.setAttribute('href', href);
    }
    const target = el.getAttribute('target');
    if (target === '_blank') {
      newEl.setAttribute('target', '_blank');
      newEl.setAttribute('rel', 'noopener noreferrer');
    }
  }

  if (TAGS_WITH_STYLE.has(tagName)) {
    const style = el.getAttribute('style');
    if (style) {
      const sanitized = sanitizeStyle(style);
      if (sanitized) {
        newEl.setAttribute('style', sanitized);
      }
    }
  }

  // Process children
  for (let i = 0; i < el.childNodes.length; i++) {
    const cleaned = cleanNode(el.childNodes[i], doc);
    if (cleaned) {
      newEl.appendChild(cleaned);
    }
  }

  return newEl;
};

export const sanitizeHTML = (html: string): string => {
  if (!html) return '';

  const parser = new DOMParser();
  const parsed = parser.parseFromString(html, 'text/html');
  const body = parsed.body;

  const doc = document.implementation.createHTMLDocument('');
  const container = doc.createElement('div');

  for (let i = 0; i < body.childNodes.length; i++) {
    const cleaned = cleanNode(body.childNodes[i], doc);
    if (cleaned) {
      container.appendChild(cleaned);
    }
  }

  return container.innerHTML;
};
