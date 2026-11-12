// React
export { useEditor } from './react/useEditor';
export { EditorProvider } from './react/EditorProvider';
export { EditorContent } from './react/EditorContent';
export { useEditorContext } from './react/EditorContext';
export { useEditorState, useIsActive, useCanUndo, useCanRedo } from './react/hooks';

// Extensions
export { mark, block } from './extensions/factories';
export { Bold, Italic, Underline, Strikethrough, Code } from './extensions/marks';
export { Heading, OrderedList, UnorderedList, Blockquote, CodeBlock, TextAlign } from './extensions/blocks';
export { Link } from './extensions/link';

// Serializers
export { toHTML, toJSON } from './core/serialize';

// Types
export type {
  Extension,
  MarkSpec,
  BlockSpec,
  AttributeRule,
  CommandFn,
  EditorInstance,
  EditorHistory,
  EditorOptions,
  DocumentJSON,
  NodeJSON,
  MarkJSON,
  EditorContentProps,
} from './core/types';
