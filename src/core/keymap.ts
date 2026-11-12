import type { Extension } from './types';

const isMac =
  typeof navigator !== 'undefined' &&
  /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);

const MODIFIER_KEYS = new Set(['Control', 'Shift', 'Alt', 'Meta']);

export const parseKeyEvent = (e: KeyboardEvent): string => {
  const parts: string[] = [];

  if (isMac ? e.metaKey : e.ctrlKey) parts.push('Mod');
  if (e.shiftKey) parts.push('Shift');
  if (e.altKey) parts.push('Alt');
  if (!MODIFIER_KEYS.has(e.key)) {
    parts.push(e.key.length === 1 ? e.key.toUpperCase() : e.key);
  }

  return parts.join('+');
};

export const resolveShortcut = (extensions: Extension[], key: string): string | null => {
  for (const ext of extensions) {
    const command = ext.keyboardShortcuts?.[key];
    if (command) return command;
  }
  return null;
};
