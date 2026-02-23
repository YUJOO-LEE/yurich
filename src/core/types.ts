export type Extension = {
  name: string;
  commands: Record<string, CommandFn>;
  keyboardShortcuts?: Record<string, string>;
  isActive?: (editor: EditorInstance, command?: string, value?: unknown) => boolean;
};

export type CommandFn = (editor: EditorInstance, value?: unknown) => void;

export type EditorInstance = {
  readonly el: HTMLDivElement | null;
  /** @internal Called by EditorContent to attach/detach the DOM element */
  attachEl(el: HTMLDivElement | null): void;
  readonly extensions: Extension[];
  execute: (command: string, value?: unknown) => void;
  getHTML: () => string;
  getJSON: () => DocumentJSON;
  isActive: (commandOrName: string, value?: unknown) => boolean;
  history: HistoryManager;
  onChange?: (html: string) => void;
  onChangeJSON?: (json: DocumentJSON) => void;
  forceUpdate: () => void;
  /** @internal Used by EditorContent to set initial HTML */
  initialValue?: string;
};

export type HistoryManager = {
  init: (html: string) => void;
  push: (html: string) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  destroy: () => void;
};

export type DocumentJSON = {
  type: 'doc';
  content: NodeJSON[];
};

export type NodeJSON = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: NodeJSON[];
  marks?: MarkJSON[];
  text?: string;
};

export type MarkJSON = {
  type: string;
  attrs?: Record<string, unknown>;
};

export type EditorContentProps = {
  className?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
};

export type UseEditorOptions = {
  extensions: Extension[];
  initialValue?: string;
  onChange?: (html: string) => void;
  onChangeJSON?: (json: DocumentJSON) => void;
  sanitize?: boolean;
  historyLimit?: number;
};
