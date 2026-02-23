import type { Extension } from '../core/types';
import { isWithinTag, wrapSelection, unwrapSelection } from '../core/selection';

export const Bold: Extension = {
  name: 'bold',
  commands: {
    toggleBold: () => {
      if (isWithinTag('STRONG')) {
        unwrapSelection('STRONG');
      } else {
        wrapSelection('strong');
      }
    },
  },
  keyboardShortcuts: { 'Mod+B': 'toggleBold' },
  isActive: () => isWithinTag('STRONG'),
};
