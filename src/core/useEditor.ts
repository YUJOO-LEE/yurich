import { useRef, useReducer } from 'react';
import type { EditorInstance, Extension, UseEditorOptions, DocumentJSON } from './types';
import { createHistoryManager, type HistoryContext } from './history';
import { executeCommand } from './command';
import { sanitizeHTML } from './sanitize';
import { toJSON } from '../serializer/json';

export const useEditor = (options: UseEditorOptions): EditorInstance => {
  const {
    extensions,
    initialValue,
    onChange,
    onChangeJSON,
    sanitize = true,
    historyLimit = 100,
  } = options;

  const elRef = useRef<HTMLDivElement | null>(null);
  const extensionsRef = useRef<Extension[]>(extensions);
  const onChangeRef = useRef(onChange);
  const onChangeJSONRef = useRef(onChangeJSON);
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0);

  // Keep refs up to date on every render
  extensionsRef.current = extensions;
  onChangeRef.current = onChange;
  onChangeJSONRef.current = onChangeJSON;

  const historyCtxRef = useRef<HistoryContext>({
    getEl: () => elRef.current,
    afterApply: () => {},
    sanitize: sanitizeHTML,
  });
  const historyRef = useRef(createHistoryManager(historyLimit, historyCtxRef.current));

  const editorRef = useRef<EditorInstance | null>(null);
  if (!editorRef.current) {
    const instance: EditorInstance = {
      get el() {
        return elRef.current;
      },
      attachEl(el: HTMLDivElement | null) {
        elRef.current = el;
      },
      get extensions() {
        return extensionsRef.current;
      },
      get history() {
        return historyRef.current;
      },
      get onChange() {
        return onChangeRef.current;
      },
      get onChangeJSON() {
        return onChangeJSONRef.current;
      },
      forceUpdate,
      initialValue,

      execute(command: string, value?: unknown): void {
        executeCommand(instance, command, value);
        requestAnimationFrame(() => {
          if (!instance.el) return;
          instance.history.push(instance.el.innerHTML);
          forceUpdate();
          const html = instance.getHTML();
          instance.onChange?.(html);
          if (instance.onChangeJSON) {
            instance.onChangeJSON(instance.getJSON());
          }
        });
      },

      getHTML(): string {
        if (!instance.el) return '';
        const raw = instance.el.innerHTML;
        return sanitize ? sanitizeHTML(raw) : raw;
      },

      getJSON(): DocumentJSON {
        if (!instance.el) {
          return { type: 'doc', content: [] };
        }
        return toJSON(instance.el);
      },

      isActive(commandOrName: string, value?: unknown): boolean {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0 || !instance.el?.contains(sel.anchorNode)) {
          return false;
        }
        // 1) command 이름으로 extension 찾기
        for (const ext of instance.extensions) {
          if (ext.commands[commandOrName] && ext.isActive) {
            return ext.isActive(instance, commandOrName, value);
          }
        }
        // 2) extension name으로 폴백
        for (const ext of instance.extensions) {
          if (ext.name === commandOrName && ext.isActive) {
            return ext.isActive(instance, commandOrName, value);
          }
        }
        return false;
      },
    };

    // Connect afterApply to trigger re-render + onChange callbacks
    historyCtxRef.current.afterApply = () => {
      forceUpdate();
      requestAnimationFrame(() => {
        if (!instance.el) return;
        instance.onChange?.(instance.getHTML());
        instance.onChangeJSON?.(instance.getJSON());
      });
    };

    editorRef.current = instance;
  }

  return editorRef.current;
};
