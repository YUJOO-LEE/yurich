import type { Extension } from '../core/types';
import { setBlockTag } from '../core/selection';

const currentHeadingLevel = (): number => {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return 0;
  let node: Node | null = selection.anchorNode;
  while (node) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const match = (node as Element).tagName.match(/^H([1-6])$/);
      if (match) return Number(match[1]);
    }
    node = node.parentElement;
  }
  return 0;
};

export const Heading: Extension = {
  name: 'heading',
  commands: {
    setHeading: (_editor, value) => {
      setBlockTag('h' + (value as number));
    },
    removeHeading: () => {
      setBlockTag('p');
    },
  },
  isActive: (_editor, command, value) => {
    const level = currentHeadingLevel();
    if (command === 'setHeading') return level === (value as number);
    if (command === 'removeHeading') return level === 0;
    return level > 0;
  },
};
