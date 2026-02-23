import type React from 'react';
import { useRef, useEffect } from 'react';
import type { EditorContentProps } from './types';
import { useEditorContext } from './EditorContext';
import { sanitizeHTML } from './sanitize';
import { normalizeHTML } from './normalize';
import { parseKeyEvent, resolveShortcut, executeCommand } from './command';
import { insertHTMLAtCursor } from './selection';

export const EditorContent = ({
  className,
  ariaLabel,
  ariaDescribedBy,
}: EditorContentProps) => {
  const editor = useEditorContext();
  const divRef = useRef<HTMLDivElement | null>(null);
  const isComposingRef = useRef(false);
  const initializedRef = useRef(false);

  // Attach div to editor on mount
  useEffect(() => {
    const el = divRef.current;
    if (!el) return;

    editor.attachEl(el);

    // Set initial value on first mount only
    if (!initializedRef.current) {
      initializedRef.current = true;
      if (editor.initialValue) {
        el.innerHTML = sanitizeHTML(editor.initialValue);
      }
      editor.history.init(el.innerHTML);
    }

    return () => {
      editor.attachEl(null);
      editor.history.destroy();
    };
  }, [editor]);

  // Listen for selectionchange at document level to trigger forceUpdate for toolbar
  useEffect(() => {
    const handleSelectionChange = () => {
      const sel = window.getSelection();
      if (sel && editor.el?.contains(sel.anchorNode)) {
        editor.forceUpdate();
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [editor]);

  const handleCompositionStart = () => {
    isComposingRef.current = true;
  };

  const handleCompositionEnd = () => {
    isComposingRef.current = false;

    // Push history after composition ends (IME input)
    const el = divRef.current;
    if (!el) return;
    normalizeHTML(el);
    editor.history.push(el.innerHTML);

    requestAnimationFrame(() => {
      if (!el) return;
      editor.onChange?.(editor.getHTML());
      if (editor.onChangeJSON) {
        editor.onChangeJSON(editor.getJSON());
      }
    });
  };

  const handleInput = () => {
    if (isComposingRef.current) return;

    const el = divRef.current;
    if (!el) return;

    // Normalize the DOM
    normalizeHTML(el);

    // Push history snapshot
    editor.history.push(el.innerHTML);

    // Schedule onChange via RAF
    requestAnimationFrame(() => {
      if (!el) return;
      editor.onChange?.(editor.getHTML());
      if (editor.onChangeJSON) {
        editor.onChangeJSON(editor.getJSON());
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Intercept undo/redo before extension shortcuts
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      editor.history.undo();
      return;
    }
    if (mod && (e.key === 'z' && e.shiftKey || e.key === 'y')) {
      e.preventDefault();
      editor.history.redo();
      return;
    }

    const keyCombo = parseKeyEvent(e.nativeEvent);
    const commandName = resolveShortcut(editor.extensions, keyCombo);

    if (commandName) {
      e.preventDefault();
      executeCommand(editor, commandName);

      // Schedule onChange after command
      requestAnimationFrame(() => {
        const el = divRef.current;
        if (!el) return;
        editor.history.push(el.innerHTML);
        editor.onChange?.(editor.getHTML());
        if (editor.onChangeJSON) {
          editor.onChangeJSON(editor.getJSON());
        }
      });
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();

    const clipboardData = e.clipboardData;
    const html = clipboardData.getData('text/html');
    const text = clipboardData.getData('text/plain');

    if (html) {
      insertHTMLAtCursor(sanitizeHTML(html));
    } else if (text) {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        range.deleteContents();
        range.insertNode(document.createTextNode(text));
        range.collapse(false);
      }
    }

    // Push history after paste
    const el = divRef.current;
    if (el) {
      editor.history.push(el.innerHTML);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  return (
    <div
      ref={divRef}
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-multiline="true"
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      tabIndex={0}
      className={className}
      onInput={handleInput}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      onDrop={handleDrop}
      onCompositionStart={handleCompositionStart}
      onCompositionEnd={handleCompositionEnd}
    />
  );
};

EditorContent.displayName = 'EditorContent';
