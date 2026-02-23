import type { Extension } from '../core/types';
import { getClosestBlock, setBlockStyle } from '../core/selection';

const alignMap: Record<string, string> = {
  alignLeft: 'left',
  alignCenter: 'center',
  alignRight: 'right',
  alignJustify: 'justify',
};

export const TextAlign: Extension = {
  name: 'textAlign',
  commands: {
    alignLeft: () => {
      setBlockStyle('textAlign', 'left');
    },
    alignCenter: () => {
      setBlockStyle('textAlign', 'center');
    },
    alignRight: () => {
      setBlockStyle('textAlign', 'right');
    },
    alignJustify: () => {
      setBlockStyle('textAlign', 'justify');
    },
  },
  isActive: (_editor, command) => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return false;
    const block = getClosestBlock(sel.getRangeAt(0).startContainer);
    if (!block) return false;
    const align = block.style.textAlign || 'left';
    return align === (command ? alignMap[command] : '');
  },
};
