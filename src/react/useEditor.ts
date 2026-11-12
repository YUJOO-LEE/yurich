import { useEffect, useState } from 'react';
import type { EditorInstance, EditorOptions } from '../core/types';
import { createEditor } from '../core/editor';

export const useEditor = (options: EditorOptions): EditorInstance => {
  const [editor] = useState(() => createEditor(options));
  const { extensions, onChange, onChangeJSON } = options;

  useEffect(() => {
    editor.setOptions({ extensions, onChange, onChangeJSON });
  });

  useEffect(() => () => editor.destroy(), [editor]);

  return editor;
};
