import type { Extension } from '../core/types';
import { isWithinTag, wrapSelection, unwrapSelection } from '../core/selection';

const ALLOWED_PROTOCOL = /^(https?:\/\/|mailto:)/i;

export const Link: Extension = {
  name: 'link',
  commands: {
    setLink: (_editor, value) => {
      const url = (value as { href: string } | undefined)?.href;
      if (!url) return;
      if (!ALLOWED_PROTOCOL.test(url)) return;
      wrapSelection('a', { href: url });
    },
    removeLink: () => {
      unwrapSelection('A');
    },
  },
  isActive: () => isWithinTag('A'),
};
