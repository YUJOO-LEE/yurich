import type { Extension } from '../core/types';
import { block } from './factories';

export const Blockquote = block({ name: 'blockquote', tag: 'blockquote' });
export const CodeBlock = block({ name: 'codeBlock', tag: 'pre' });

const LEVELS = [1, 2, 3, 4, 5, 6];

export const Heading: Extension = {
  name: 'heading',
  blocks: LEVELS.map(level => ({ tag: `h${level}`, type: 'heading', attrs: { level } })),
  commands: {
    setHeading: (editor, value) => {
      if (LEVELS.includes(value as number)) editor.setBlock(`h${value}`);
    },
    removeHeading: editor => editor.setBlock('p'),
  },
  isActive: (editor, command, value) => {
    if (command === 'setHeading') return LEVELS.includes(value as number) && editor.isBlockActive(`h${value}`);
    const isHeading = LEVELS.some(level => editor.isBlockActive(`h${level}`));
    return command === 'removeHeading' ? !isHeading : isHeading;
  },
};

const list = (name: string, tag: 'ol' | 'ul'): Extension => {
  const command = `toggle${name[0].toUpperCase()}${name.slice(1)}`;
  return {
    name,
    blocks: [{ tag, type: name }, { tag: 'li', type: 'listItem' }],
    commands: { [command]: editor => editor.toggleList(tag) },
    isActive: editor => editor.isListActive(tag),
  };
};

export const OrderedList = list('orderedList', 'ol');
export const UnorderedList = list('unorderedList', 'ul');

const ALIGNMENTS: Record<string, string> = {
  alignLeft: 'left',
  alignCenter: 'center',
  alignRight: 'right',
  alignJustify: 'justify',
};

export const TextAlign: Extension = {
  name: 'textAlign',
  blockStyles: { 'text-align': Object.values(ALIGNMENTS) },
  commands: Object.fromEntries(
    Object.entries(ALIGNMENTS).map(([command, value]) => [
      command,
      editor => editor.setBlockStyle('text-align', value),
    ]),
  ),
  isActive: (editor, command) =>
    command !== undefined && (editor.getBlockStyle('text-align') ?? 'left') === ALIGNMENTS[command],
};
