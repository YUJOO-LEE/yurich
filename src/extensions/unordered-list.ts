import type { Extension } from '../core/types';
import { isWithinTag, toggleList } from '../core/selection';

export const UnorderedList: Extension = {
  name: 'unorderedList',
  commands: {
    toggleUnorderedList: () => {
      toggleList('ul');
    },
  },
  isActive: () => isWithinTag('UL'),
};
