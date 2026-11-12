import { useRef, useSyncExternalStore } from 'react';
import type { EditorInstance } from '../core/types';

export const useEditorState = <T>(
  editor: EditorInstance,
  selector: (editor: EditorInstance) => T,
): T => {
  const cacheRef = useRef<{
    revision: number;
    selector: (editor: EditorInstance) => T;
    value: T;
  } | null>(null);

  // useSyncExternalStore needs the same value back until the editor changes, even when the selector builds an object
  const getSnapshot = (): T => {
    const cache = cacheRef.current;
    if (cache && cache.revision === editor.revision && cache.selector === selector) {
      return cache.value;
    }
    const value = selector(editor);
    cacheRef.current = { revision: editor.revision, selector, value };
    return value;
  };

  return useSyncExternalStore(editor.subscribe, getSnapshot, getSnapshot);
};

export const useIsActive = (
  editor: EditorInstance,
  commandOrName: string,
  value?: unknown,
): boolean => useEditorState(editor, e => e.isActive(commandOrName, value));

export const useCanUndo = (editor: EditorInstance): boolean =>
  useEditorState(editor, e => e.history.canUndo());

export const useCanRedo = (editor: EditorInstance): boolean =>
  useEditorState(editor, e => e.history.canRedo());
