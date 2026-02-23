import type { ReactNode } from 'react';
import type { EditorInstance } from './types';
import { EditorContext } from './EditorContext';

type EditorProviderProps = {
  editor: EditorInstance;
  children: ReactNode;
};

export const EditorProvider = ({ editor, children }: EditorProviderProps) => {
  return (
    <EditorContext.Provider value={editor}>
      {children}
    </EditorContext.Provider>
  );
};
