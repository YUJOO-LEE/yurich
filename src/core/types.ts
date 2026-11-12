export type AttributeRule = (value: string | null, el: Element) => string | null;

export type MarkSpec = {
  /** Lowercase tag the mark is written as */
  tag: string;
  /** Mark type in JSON */
  type: string;
  /** Other tags read as this mark and rewritten to `tag` */
  aliases?: string[];
  /** Attributes to keep. A rule returns the value to write, or null to leave the attribute out. */
  attrs?: Record<string, AttributeRule>;
};

export type BlockSpec = {
  tag: string;
  /** Node type in JSON */
  type: string;
  aliases?: string[];
  /** Fixed attributes added to the JSON node */
  attrs?: Record<string, unknown>;
};

export type Extension = {
  name: string;
  marks?: MarkSpec[];
  blocks?: BlockSpec[];
  /** CSS properties allowed on blocks, with the values each may take */
  blockStyles?: Record<string, readonly string[]>;
  commands?: Record<string, CommandFn>;
  keyboardShortcuts?: Record<string, string>;
  isActive?: (editor: EditorInstance, command?: string, value?: unknown) => boolean;
};

export type CommandFn = (editor: EditorInstance, value?: unknown) => void;

export type EditorOptions = {
  extensions: Extension[];
  initialValue?: string;
  onChange?: (html: string) => void;
  onChangeJSON?: (json: DocumentJSON) => void;
  sanitize?: boolean;
  historyLimit?: number;
};

export type EditorHistory = {
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
};

export type EditorInstance = {
  /** The editable element. Null until the editor is first mounted. */
  readonly el: HTMLElement | null;
  readonly extensions: Extension[];
  /** Increases whenever content, selection, or history changes */
  readonly revision: number;
  readonly history: EditorHistory;

  mount: (host: HTMLElement) => void;
  unmount: () => void;
  destroy: () => void;
  setOptions: (options: Partial<EditorOptions>) => void;
  subscribe: (listener: () => void) => () => void;

  execute: (command: string, value?: unknown) => void;
  isActive: (commandOrName: string, value?: unknown) => boolean;
  getHTML: () => string;
  getJSON: () => DocumentJSON;
  /** Replaces the whole document. `history: false` clears the undo history instead of adding a step. */
  setHTML: (html: string, options?: { history?: boolean }) => void;

  /** Runs a DOM edit, then normalizes the document, records history and reports the change */
  change: (edit: () => void) => void;
  toggleMark: (tag: string) => void;
  /** With only a caret, `text` is inserted and becomes the marked content */
  setMark: (tag: string, attrs?: Record<string, string>, text?: string) => void;
  removeMark: (tag: string) => void;
  isMarkActive: (tag: string) => boolean;
  setBlock: (tag: string) => void;
  toggleBlock: (tag: string) => void;
  isBlockActive: (tag: string) => boolean;
  toggleList: (tag: 'ol' | 'ul') => void;
  isListActive: (tag: 'ol' | 'ul') => boolean;
  setBlockStyle: (property: string, value: string) => void;
  getBlockStyle: (property: string) => string | null;
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
