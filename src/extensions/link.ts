import type { Extension } from '../core/types';

const isAllowedHref = (href: string): boolean => /^(https?:\/\/|mailto:)/i.test(href);

export const Link: Extension = {
  name: 'link',
  marks: [{
    tag: 'a',
    type: 'link',
    attrs: {
      href: value => (value && isAllowedHref(value) ? value : null),
      target: value => (value === '_blank' ? value : null),
      rel: (_, el) => (el.getAttribute('target') === '_blank' ? 'noopener noreferrer' : null),
    },
  }],
  commands: {
    setLink: (editor, value) => {
      const href = (value as { href?: string } | undefined)?.href;
      if (href && isAllowedHref(href)) editor.setMark('a', { href }, href);
    },
    removeLink: editor => editor.removeMark('a'),
  },
  isActive: editor => editor.isMarkActive('a'),
};
