import type { DocumentJSON, EditorInstance, EditorOptions, MarkSpec, NodeJSON } from './types';
import { createSchema } from './schema';
import { createHistory, type HistoryTarget } from './history';
import { normalize } from './normalize';
import { sanitizeHTML, sanitizeNodes } from './sanitize';
import { nodeToJSON } from './serialize';
import { getRange, restoreSelection, saveSelection, type SelectionPath } from './selection';
import { applyMark, isMarkActive, removeMark, toggleMark } from './marks';
import { getBlockStyle, isBlockActive, setBlock, setBlockStyle } from './blocks';
import { isListActive, toggleList } from './lists';
import { insertHTML, insertText } from './clipboard';
import { parseKeyEvent, resolveShortcut } from './keymap';

type BlockCache = { raw?: string; html?: string; json?: NodeJSON[] };

const sameBlocks = (a: string[], b: string[]): boolean =>
  a.length === b.length && a.every((block, index) => block === b[index]);

export const createEditor = (initialOptions: EditorOptions): EditorInstance => {
  let options = initialOptions;
  let schema = createSchema(options.extensions);
  const history = createHistory(options.historyLimit ?? 100);

  let root: HTMLElement | null = null;
  let observer: MutationObserver | null = null;
  let composing = false;
  let changeDepth = 0;
  let revision = 0;
  let changeFrame: number | null = null;
  const listeners = new Set<() => void>();

  let cache = new WeakMap<Node, BlockCache>();
  const dirty = new Set<Node>();
  let mutated = false;
  let recordedBlocks: string[] = [];
  let lastSelection: SelectionPath | null = null;

  const notify = (): void => {
    revision++;
    listeners.forEach(listener => listener());
  };

  const scheduleChange = (): void => {
    if (changeFrame !== null) return;
    changeFrame = requestAnimationFrame(() => {
      changeFrame = null;
      options.onChange?.(editor.getHTML());
      options.onChangeJSON?.(editor.getJSON());
    });
  };

  const cached = (node: Node): BlockCache => {
    let entry = cache.get(node);
    if (!entry) {
      entry = {};
      cache.set(node, entry);
    }
    return entry;
  };

  const collect = (records: MutationRecord[]): void => {
    if (!root) return;
    for (const record of records) {
      mutated = true;
      if (record.target === root) {
        record.addedNodes.forEach(node => dirty.add(node));
        continue;
      }
      let top: Node | null = record.target;
      while (top && top.parentNode !== root) top = top.parentNode;
      if (top) {
        dirty.add(top);
        cache.delete(top);
      }
    }
  };

  const rawBlocks = (el: HTMLElement): string[] =>
    Array.from(el.children, child => (cached(child).raw ??= child.outerHTML));

  const flush = (typed = false): void => {
    if (!root || !observer) return;
    collect(observer.takeRecords());
    if (!mutated || composing) return;

    normalize(root, schema, dirty);
    collect(observer.takeRecords());
    dirty.clear();
    mutated = false;

    const blocks = rawBlocks(root);
    if (!sameBlocks(blocks, recordedBlocks)) {
      history.record({ blocks, before: lastSelection, after: saveSelection(root) }, typed);
      recordedBlocks = blocks;
      scheduleChange();
    }
    lastSelection = saveSelection(root) ?? lastSelection;
    notify();
  };

  const apply = (target: HistoryTarget | null): void => {
    if (!target || !root || !observer) return;
    const { blocks } = target;

    let start = 0;
    while (start < recordedBlocks.length && start < blocks.length && recordedBlocks[start] === blocks[start]) start++;
    let oldEnd = recordedBlocks.length;
    let newEnd = blocks.length;
    while (oldEnd > start && newEnd > start && recordedBlocks[oldEnd - 1] === blocks[newEnd - 1]) {
      oldEnd--;
      newEnd--;
    }

    const nodes = Array.from(root.children);
    const template = document.createElement('template');
    template.innerHTML = sanitizeHTML(blocks.slice(start, newEnd).join(''), schema);
    nodes.slice(start, oldEnd).forEach(node => node.remove());
    root.insertBefore(template.content, nodes[oldEnd] ?? null);

    collect(observer.takeRecords());
    dirty.clear();
    mutated = false;
    recordedBlocks = rawBlocks(root);

    restoreSelection(root, target.selection);
    lastSelection = target.selection;
    notify();
    scheduleChange();
  };

  const handleSelectionChange = (() => {
    let wasInside = false;
    return (): void => {
      const isInside = !!root && getRange(root) !== null;
      if (root && isInside) lastSelection = saveSelection(root);
      // Leaving the editor must also be reported, or toolbar buttons stay pressed
      if (isInside || wasInside) notify();
      wasInside = isInside;
    };
  })();

  const handleKeyDown = (e: KeyboardEvent): void => {
    // Editing the DOM under an IME composition corrupts it
    if (e.isComposing) return;

    const mod = e.metaKey || e.ctrlKey;
    // Shift or Caps Lock reports the key as 'Z'
    const key = e.key.toLowerCase();
    if (mod && (key === 'z' || key === 'y')) {
      e.preventDefault();
      if (key === 'z' && !e.shiftKey) editor.history.undo();
      else editor.history.redo();
      return;
    }

    const command = resolveShortcut(options.extensions, parseKeyEvent(e));
    if (command) {
      e.preventDefault();
      editor.execute(command);
    }
  };

  const handlePaste = (e: ClipboardEvent): void => {
    e.preventDefault();
    const html = e.clipboardData?.getData('text/html');
    const text = e.clipboardData?.getData('text/plain');

    editor.change(() => {
      const range = root && getRange(root);
      if (!root || !range) return;
      if (html) insertHTML(root, range, sanitizeHTML(html, schema), schema);
      else if (text) insertText(root, range, text);
    });
  };

  const load = (el: HTMLElement, html: string): void => {
    el.innerHTML = sanitizeHTML(html, schema);
    normalize(el, schema, Array.from(el.childNodes));
    recordedBlocks = rawBlocks(el);
    history.reset(recordedBlocks);
    lastSelection = null;
  };

  const createRoot = (): HTMLElement => {
    const el = document.createElement('div');
    el.contentEditable = 'true';
    el.setAttribute('role', 'textbox');
    el.setAttribute('aria-multiline', 'true');
    el.tabIndex = 0;

    load(el, options.initialValue ?? '');

    el.addEventListener('keydown', handleKeyDown);
    el.addEventListener('paste', handlePaste);
    // Dropped content would bypass the sanitizer
    el.addEventListener('drop', e => e.preventDefault());
    el.addEventListener('compositionstart', () => {
      composing = true;
    });
    el.addEventListener('compositionend', () => {
      composing = false;
      flush(true);
    });

    // Typing, paste, commands, IME and the app's own DOM edits are all noticed here and nowhere else
    observer = new MutationObserver(records => {
      collect(records);
      flush(true);
    });
    observer.observe(el, { childList: true, subtree: true, characterData: true, attributes: true });
    return el;
  };

  const markSpec = (tag: string): MarkSpec | null => {
    const spec = schema.marks.get(tag);
    return spec && spec.tag === tag ? spec : null;
  };

  const edit = (run: (el: HTMLElement, range: Range) => void): void => {
    editor.change(() => {
      const range = root && getRange(root);
      if (root && range) run(root, range);
    });
  };

  const query = <T>(fallback: T, run: (el: HTMLElement, range: Range) => T): T => {
    const range = root && getRange(root);
    return root && range ? run(root, range) : fallback;
  };

  const editor: EditorInstance = {
    get el() {
      return root;
    },
    get extensions() {
      return options.extensions;
    },
    get revision() {
      return revision;
    },

    history: {
      undo: () => {
        flush();
        apply(history.undo());
      },
      redo: () => {
        flush();
        apply(history.redo());
      },
      canUndo: () => history.canUndo(),
      canRedo: () => history.canRedo(),
    },

    mount(host) {
      root ??= createRoot();
      host.append(root);
      document.addEventListener('selectionchange', handleSelectionChange);
    },

    unmount() {
      root?.remove();
      document.removeEventListener('selectionchange', handleSelectionChange);
    },

    destroy() {
      history.cancelTimer();
      if (changeFrame !== null) {
        cancelAnimationFrame(changeFrame);
        changeFrame = null;
      }
    },

    setOptions(next) {
      const extensionsChanged =
        next.extensions !== undefined &&
        (next.extensions.length !== options.extensions.length ||
          next.extensions.some((ext, index) => ext !== options.extensions[index]));

      options = { ...options, ...next };
      if (extensionsChanged) {
        schema = createSchema(options.extensions);
        cache = new WeakMap();
      }
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    execute(command, value) {
      for (const ext of options.extensions) {
        const run = ext.commands?.[command];
        if (run) {
          editor.change(() => run(editor, value));
          return;
        }
      }
      throw new Error(`Command not found: ${command}`);
    },

    isActive(commandOrName, value) {
      if (!root || !getRange(root)) return false;
      const ext =
        options.extensions.find(e => e.commands?.[commandOrName] && e.isActive) ??
        options.extensions.find(e => e.name === commandOrName && e.isActive);
      return ext?.isActive?.(editor, commandOrName, value) ?? false;
    },

    getHTML() {
      if (!root) return '';
      flush();
      if (options.sanitize === false) return root.innerHTML;
      return Array.from(root.children, child =>
        (cached(child).html ??= sanitizeNodes([child], schema))).join('');
    },

    getJSON(): DocumentJSON {
      if (!root) return { type: 'doc', content: [] };
      flush();
      return {
        type: 'doc',
        content: Array.from(root.children).flatMap(child =>
          (cached(child).json ??= nodeToJSON(child, schema))),
      };
    },

    setHTML(html, { history: keepHistory = true } = {}) {
      if (!root || !observer) {
        options = { ...options, initialValue: html };
        return;
      }

      flush();
      if (keepHistory) {
        root.innerHTML = sanitizeHTML(html, schema);
        flush();
        return;
      }

      load(root, html);
      observer.takeRecords();
      dirty.clear();
      mutated = false;
      notify();
      scheduleChange();
    },

    change(run) {
      if (!root || composing) return;
      if (changeDepth > 0) {
        run();
        return;
      }
      flush();
      changeDepth++;
      try {
        run();
      } finally {
        changeDepth--;
      }
      flush();
    },

    toggleMark(tag) {
      const spec = markSpec(tag);
      if (spec) edit((el, range) => toggleMark(el, range, spec));
    },
    setMark(tag, attrs, text) {
      const spec = markSpec(tag);
      if (spec) edit((el, range) => applyMark(el, range, spec, attrs, text));
    },
    removeMark(tag) {
      const spec = markSpec(tag);
      if (spec) edit((el, range) => removeMark(el, range, spec));
    },
    isMarkActive(tag) {
      const spec = markSpec(tag);
      return spec ? query(false, (el, range) => isMarkActive(el, range, spec)) : false;
    },

    setBlock(tag) {
      editor.change(() => root && setBlock(root, schema, tag));
    },
    toggleBlock(tag) {
      editor.setBlock(editor.isBlockActive(tag) ? 'p' : tag);
    },
    isBlockActive(tag) {
      return root ? isBlockActive(root, schema, tag) : false;
    },
    toggleList(tag) {
      editor.change(() => root && toggleList(root, schema, tag));
    },
    isListActive(tag) {
      return root ? isListActive(root, schema, tag) : false;
    },
    setBlockStyle(property, value) {
      editor.change(() => root && setBlockStyle(root, schema, property, value));
    },
    getBlockStyle(property) {
      return root ? getBlockStyle(root, schema, property) : null;
    },
  };

  return editor;
};
