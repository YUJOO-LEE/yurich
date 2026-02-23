import type { Extension } from '../core/types';
import { isWithinTag, wrapSelection, unwrapSelection } from '../core/selection';

export const Underline: Extension = {
  name: 'underline',
  commands: {
    toggleUnderline: () => {
      if (isWithinTag('U')) {
        unwrapSelection('U');
      } else {
        wrapSelection('u');
      }
    },
  },
  keyboardShortcuts: { 'Mod+U': 'toggleUnderline' },
  isActive: () => isWithinTag('U'),
};
