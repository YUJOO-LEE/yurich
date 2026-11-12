import { createContext, useContext } from 'react';
import type { EditorInstance } from '../core/types';

export const EditorContext = createContext<EditorInstance | null>(null);

export const useEditorContext = (): EditorInstance => {
  const ctx = useContext(EditorContext);
  if (!ctx) {
    throw new Error(
      'useEditorContext must be used within an EditorProvider',
    );
  }
  return ctx;
};
