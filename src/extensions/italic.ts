import type { Extension } from '../core/types';
import { isWithinTag, wrapSelection, unwrapSelection } from '../core/selection';

export const Italic: Extension = {
  name: 'italic',
  commands: {
    toggleItalic: () => {
      if (isWithinTag('EM')) {
        unwrapSelection('EM');
      } else {
        wrapSelection('em');
      }
    },
  },
  keyboardShortcuts: { 'Mod+I': 'toggleItalic' },
  isActive: () => isWithinTag('EM'),
};
