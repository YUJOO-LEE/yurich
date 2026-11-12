import type { Extension } from '../core/types';

const commandName = (name: string): string => `toggle${name[0].toUpperCase()}${name.slice(1)}`;

/** An inline format toggled over the selection, e.g. `mark({ name: 'highlight', tag: 'mark' })` gives `toggleHighlight` */
export const mark = (options: {
  name: string;
  tag: string;
  aliases?: string[];
  shortcut?: string;
}): Extension => {
  const { name, tag, aliases, shortcut } = options;
  const command = commandName(name);
  return {
    name,
    marks: [{ tag, type: name, aliases }],
    commands: { [command]: editor => editor.toggleMark(tag) },
    keyboardShortcuts: shortcut ? { [shortcut]: command } : undefined,
    isActive: editor => editor.isMarkActive(tag),
  };
};

/** A block type toggled against the paragraph, e.g. `block({ name: 'blockquote', tag: 'blockquote' })` */
export const block = (options: { name: string; tag: string; shortcut?: string }): Extension => {
  const { name, tag, shortcut } = options;
  const command = commandName(name);
  return {
    name,
    blocks: [{ tag, type: name }],
    commands: { [command]: editor => editor.toggleBlock(tag) },
    keyboardShortcuts: shortcut ? { [shortcut]: command } : undefined,
    isActive: editor => editor.isBlockActive(tag),
  };
};
