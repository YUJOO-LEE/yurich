import type { Extension } from '../core/types';
import { isWithinTag, setBlockTag } from '../core/selection';

export const Blockquote: Extension = {
  name: 'blockquote',
  commands: {
    toggleBlockquote: () => {
      if (isWithinTag('BLOCKQUOTE')) {
        setBlockTag('p');
      } else {
        setBlockTag('blockquote');
      }
    },
  },
  isActive: () => isWithinTag('BLOCKQUOTE'),
};
