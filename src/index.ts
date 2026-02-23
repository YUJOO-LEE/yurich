// Core
export { useEditor } from './core/useEditor';
export { EditorProvider } from './core/EditorProvider';
export { EditorContent } from './core/EditorContent';
export { useEditorContext } from './core/EditorContext';

// Selection utilities (for custom extensions)
export {
  isWithinTag,
  wrapSelection,
  unwrapSelection,
  setBlockTag,
  toggleList,
  setBlockStyle,
} from './core/selection';

// Extensions
export { Bold } from './extensions/bold';
export { Italic } from './extensions/italic';
export { Underline } from './extensions/underline';
export { Strikethrough } from './extensions/strikethrough';
export { Heading } from './extensions/heading';
export { OrderedList } from './extensions/ordered-list';
export { UnorderedList } from './extensions/unordered-list';
export { Link } from './extensions/link';
export { Blockquote } from './extensions/blockquote';
export { Code } from './extensions/code';
export { CodeBlock } from './extensions/code-block';
export { TextAlign } from './extensions/text-align';

// Serializer
export { toHTML } from './serializer/html';
export { toJSON } from './serializer/json';

// Types
export type {
  Extension,
  CommandFn,
  EditorInstance,
  HistoryManager,
  DocumentJSON,
  NodeJSON,
  MarkJSON,
  EditorContentProps,
  UseEditorOptions,
} from './core/types';
