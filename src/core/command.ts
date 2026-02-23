import type { EditorInstance, Extension } from './types';

export const executeCommand = (
  editor: EditorInstance,
  commandName: string,
  value?: unknown,
): void => {
  for (const ext of editor.extensions) {
    const cmd = ext.commands[commandName];
    if (cmd) {
      cmd(editor, value);
      return;
    }
  }

  throw new Error(`Command not found: ${commandName}`);
};

export const resolveShortcut = (
  extensions: Extension[],
  key: string,
): string | null => {
  for (const ext of extensions) {
    if (!ext.keyboardShortcuts) continue;
    const commandName = ext.keyboardShortcuts[key];
    if (commandName) {
      return commandName;
    }
  }
  return null;
};

const isMac =
  typeof navigator !== 'undefined' &&
  /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);

export const parseKeyEvent = (e: KeyboardEvent): string => {
  const parts: string[] = [];

  const hasMod = isMac ? e.metaKey : e.ctrlKey;
  if (hasMod) parts.push('Mod');
  if (e.shiftKey) parts.push('Shift');
  if (e.altKey) parts.push('Alt');

  // Avoid adding modifier keys themselves as the main key
  const modifierKeys = new Set([
    'Control',
    'Shift',
    'Alt',
    'Meta',
  ]);

  if (!modifierKeys.has(e.key)) {
    // Normalize the key to uppercase for letter keys
    const key =
      e.key.length === 1 ? e.key.toUpperCase() : e.key;
    parts.push(key);
  }

  return parts.join('+');
};
