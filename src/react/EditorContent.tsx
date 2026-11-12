import { useEffect, useRef } from 'react';
import type { EditorContentProps } from '../core/types';
import { useEditorContext } from './EditorContext';

const setAttribute = (el: HTMLElement, name: string, value: string | undefined): void => {
  if (value === undefined) el.removeAttribute(name);
  else el.setAttribute(name, value);
};

/** A place for the editor's own element. The element and its content outlive this component. */
export const EditorContent = ({ className, ariaLabel, ariaDescribedBy }: EditorContentProps) => {
  const editor = useEditorContext();
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!hostRef.current) return;
    editor.mount(hostRef.current);
    return () => editor.unmount();
  }, [editor]);

  useEffect(() => {
    const el = editor.el;
    if (!el) return;
    setAttribute(el, 'class', className);
    setAttribute(el, 'aria-label', ariaLabel);
    setAttribute(el, 'aria-describedby', ariaDescribedBy);
  }, [editor, className, ariaLabel, ariaDescribedBy]);

  return <div ref={hostRef} style={{ display: 'contents' }} />;
};

EditorContent.displayName = 'EditorContent';
