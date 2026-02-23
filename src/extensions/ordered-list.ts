import type { Extension } from '../core/types';
import { isWithinTag, toggleList } from '../core/selection';

export const OrderedList: Extension = {
  name: 'orderedList',
  commands: {
    toggleOrderedList: () => {
      toggleList('ol');
    },
  },
  isActive: () => isWithinTag('OL'),
};
