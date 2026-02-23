import type { Extension } from '../core/types';
import { isWithinTag, wrapSelection, unwrapSelection } from '../core/selection';

export const Strikethrough: Extension = {
  name: 'strikethrough',
  commands: {
    toggleStrikethrough: () => {
      if (isWithinTag('S')) {
        unwrapSelection('S');
      } else {
        wrapSelection('s');
      }
    },
  },
  keyboardShortcuts: { 'Mod+Shift+S': 'toggleStrikethrough' },
  isActive: () => isWithinTag('S'),
};
