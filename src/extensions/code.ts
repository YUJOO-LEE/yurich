import type { Extension } from '../core/types';
import { isWithinTag, wrapSelection, unwrapSelection } from '../core/selection';

export const Code: Extension = {
  name: 'code',
  commands: {
    toggleCode: () => {
      if (isWithinTag('CODE')) {
        unwrapSelection('CODE');
      } else {
        wrapSelection('code');
      }
    },
  },
  isActive: () => isWithinTag('CODE'),
};
