import type { Extension } from '../core/types';
import { isWithinTag, setBlockTag } from '../core/selection';

export const CodeBlock: Extension = {
  name: 'codeBlock',
  commands: {
    toggleCodeBlock: () => {
      if (isWithinTag('PRE')) {
        setBlockTag('p');
      } else {
        setBlockTag('pre');
      }
    },
  },
  isActive: () => isWithinTag('PRE'),
};
