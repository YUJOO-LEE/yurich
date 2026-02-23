import { sanitizeHTML } from '../core/sanitize';

export const toHTML = (el: HTMLElement): string => {
  return sanitizeHTML(el.innerHTML);
};
