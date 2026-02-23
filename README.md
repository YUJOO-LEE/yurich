# yurich

[![GitHub](https://img.shields.io/github/stars/YUJOO-LEE/yurich?style=flat)](https://github.com/YUJOO-LEE/yurich)
[![npm](https://img.shields.io/npm/v/yurich)](https://www.npmjs.com/package/yurich)

A headless rich text editor for React built on native `contentEditable` + Selection API.

## Why yurich?

- **Zero dependencies** — Only React as a peer dependency. No ProseMirror, no Slate, no heavy document model.
- **Native contentEditable** — Uses the browser's built-in editing capabilities with the Selection API directly. Does **not** use `document.execCommand`.
- **HTML-native model** — The DOM *is* the document. No separate document model to sync. What you see is what `getHTML()` returns.
- **Headless** — No default styles or UI. Full control over your toolbar and layout.
- **Tree-shakeable** — Import only the extensions you need. Unused extensions are eliminated at build time.
- **Tiny bundle** — Minimal code footprint thanks to zero abstraction layers.
- **Accessible** — ARIA roles and keyboard shortcuts built in.
- **IME/Composition support** — Handles CJK and other IME input correctly via CompositionEvent.

## Installation

```bash
npm install yurich
```

### Peer Dependencies

React 18+ is required:

```bash
npm install react react-dom
```

## Quick Start

```tsx
import {
  useEditor,
  EditorProvider,
  EditorContent,
  Bold,
  Italic,
  Underline,
  useEditorContext,
} from 'yurich';

function ToolbarButton({ command, label, children }: {
  command: string;
  label: string;
  children: React.ReactNode;
}) {
  const editor = useEditorContext();
  return (
    <button
      aria-pressed={editor.isActive(command)}
      aria-label={label}
      onMouseDown={e => e.preventDefault()}
      onClick={() => editor.execute(command)}
    >
      {children}
    </button>
  );
}

function MyEditor() {
  const editor = useEditor({
    extensions: [Bold, Italic, Underline],
    initialValue: '<p>Hello World!</p>',
    onChange: (html) => console.log(html),
  });

  return (
    <EditorProvider editor={editor}>
      <div role="toolbar" aria-label="Formatting">
        <ToolbarButton command="toggleBold" label="Bold">B</ToolbarButton>
        <ToolbarButton command="toggleItalic" label="Italic">I</ToolbarButton>
        <ToolbarButton command="toggleUnderline" label="Underline">U</ToolbarButton>
      </div>
      <EditorContent className="my-editor" ariaLabel="Rich text editor" />
    </EditorProvider>
  );
}
```

## Extensions

All 12 built-in extensions:

| Extension | Import | Commands | Keyboard Shortcut |
|---|---|---|---|
| Bold | `Bold` | `toggleBold` | `Mod+B` |
| Italic | `Italic` | `toggleItalic` | `Mod+I` |
| Underline | `Underline` | `toggleUnderline` | `Mod+U` |
| Strikethrough | `Strikethrough` | `toggleStrikethrough` | `Mod+Shift+S` |
| Heading | `Heading` | `setHeading`, `removeHeading` | — |
| Ordered List | `OrderedList` | `toggleOrderedList` | — |
| Unordered List | `UnorderedList` | `toggleUnorderedList` | — |
| Link | `Link` | `setLink`, `removeLink` | — |
| Blockquote | `Blockquote` | `toggleBlockquote` | — |
| Code | `Code` | `toggleCode` | — |
| Code Block | `CodeBlock` | `toggleCodeBlock` | — |
| Text Align | `TextAlign` | `alignLeft`, `alignCenter`, `alignRight`, `alignJustify` | — |

> `Mod` is `Cmd` on macOS and `Ctrl` on Windows/Linux.

Import extensions individually for tree-shaking:

```ts
import { Bold } from 'yurich';
import { Italic } from 'yurich';
```

### Command values

Some commands accept a value argument:

```ts
// Set heading level (1-6)
editor.execute('setHeading', 2);

// Set link with URL
editor.execute('setLink', { href: 'https://example.com' });
```

## API Reference

### `useEditor(options)`

Creates an editor instance. Must be called inside a React component.

```ts
const editor = useEditor(options);
```

**`UseEditorOptions`**

| Option | Type | Default | Description |
|---|---|---|---|
| `extensions` | `Extension[]` | — | List of extensions to enable (required) |
| `initialValue` | `string` | `undefined` | Initial HTML content |
| `onChange` | `(html: string) => void` | `undefined` | Called when content changes (HTML) |
| `onChangeJSON` | `(json: DocumentJSON) => void` | `undefined` | Called when content changes (JSON) |
| `sanitize` | `boolean` | `true` | Sanitize HTML output |
| `historyLimit` | `number` | `100` | Max undo history entries |

### `EditorInstance`

The object returned by `useEditor`.

| Method | Signature | Description |
|---|---|---|
| `execute` | `(command: string, value?: unknown) => void` | Execute a command by name |
| `getHTML` | `() => string` | Get editor content as sanitized HTML |
| `getJSON` | `() => DocumentJSON` | Get editor content as JSON |
| `isActive` | `(name: string, value?: unknown) => boolean` | Check if a command/extension is active at current selection. `value` is used for commands like `setHeading` (e.g., `isActive('setHeading', 2)` checks for H2). |
| `history.undo` | `() => void` | Undo last change |
| `history.redo` | `() => void` | Redo last undone change |
| `history.canUndo` | `() => boolean` | Whether undo is available (includes pending debounced changes) |
| `history.canRedo` | `() => boolean` | Whether redo is available |

### `EditorProvider`

Provides the editor instance to child components via React context.

```tsx
<EditorProvider editor={editor}>
  {/* Toolbar, EditorContent, etc. */}
</EditorProvider>
```

### `EditorContent`

Renders the contentEditable area. Must be inside an `EditorProvider`.

| Prop | Type | Default | Description |
|---|---|---|---|
| `className` | `string` | `undefined` | CSS class for the editor div |
| `ariaLabel` | `string` | `undefined` | Accessible label |
| `ariaDescribedBy` | `string` | `undefined` | ID of a describing element |

Drop events are disabled by default to prevent uncontrolled content insertion.

### `useEditorContext`

Hook to access the editor instance from any child of `EditorProvider`.

```ts
import { useEditorContext } from 'yurich';

function MyButton() {
  const editor = useEditorContext();
  return <button onClick={() => editor.execute('toggleBold')}>B</button>;
}
```

### Serializers

Standalone functions for converting editor content:

```ts
import { toHTML, toJSON } from 'yurich';

// toHTML sanitizes the output
const html = toHTML(editorElement);

// toJSON converts to a DocumentJSON structure
const json = toJSON(editorElement);
```

### Selection Utilities

Exported for use in custom extensions:

| Function | Signature | Description |
|---|---|---|
| `isWithinTag` | `(tagName: string) => boolean` | Check if current selection is inside a tag |
| `wrapSelection` | `(tagName: string, attrs?: Record<string, string>) => void` | Wrap selection in a tag |
| `unwrapSelection` | `(tagName: string) => void` | Remove wrapping tag from selection |
| `setBlockTag` | `(tagName: string) => void` | Change the block-level tag of the current block |
| `toggleList` | `(listTag: 'ol' \| 'ul') => void` | Toggle list wrapping on the current block |
| `setBlockStyle` | `(property: string, value: string) => void` | Set a CSS style property on the current block |

## Output Formats

### HTML

```ts
const html = editor.getHTML();
// '<p>Hello <strong>World</strong></p>'
```

### JSON

```ts
const json = editor.getJSON();
```

Returns a `DocumentJSON` structure:

```json
{
  "type": "doc",
  "content": [
    {
      "type": "paragraph",
      "content": [
        { "type": "text", "text": "Hello " },
        {
          "type": "text",
          "text": "World",
          "marks": [{ "type": "bold" }]
        }
      ]
    }
  ]
}
```

**Node types:** `paragraph`, `heading` (with `attrs.level`), `blockquote`, `codeBlock`, `orderedList`, `unorderedList`, `listItem`, `text`

**Mark types:** `bold`, `italic`, `underline`, `strikethrough`, `code`, `link` (with `attrs.href`)

## Custom Extensions

An extension implements the `Extension` interface:

```ts
import type { Extension } from 'yurich';
import { isWithinTag, wrapSelection, unwrapSelection } from 'yurich';

const Highlight: Extension = {
  name: 'highlight',
  commands: {
    toggleHighlight: () => {
      if (isWithinTag('MARK')) {
        unwrapSelection('MARK');
      } else {
        wrapSelection('mark');
      }
    },
  },
  keyboardShortcuts: {
    'Mod+Shift+H': 'toggleHighlight',
  },
  isActive: () => isWithinTag('MARK'),
};
```

**`Extension` interface:**

| Field | Type | Description |
|---|---|---|
| `name` | `string` | Unique extension name |
| `commands` | `Record<string, CommandFn>` | Map of command names to functions |
| `keyboardShortcuts` | `Record<string, string>` | Map of key combos to command names (optional) |
| `isActive` | `(editor, command?, value?) => boolean` | Returns whether the extension is active at the current selection (optional) |

## Internals

### History

The editor maintains an undo/redo history stack with **300ms debounce**. Rapid keystrokes are merged into a single history entry. `canUndo()` returns `true` if there are pending (not yet committed) changes in addition to committed undo entries.

History entries are sanitized on restore (undo/redo) to prevent XSS from persisted or manipulated state.

### HTML Normalization

On every input, the editor normalizes the DOM:
- `<b>` is replaced with `<strong>`
- `<i>` is replaced with `<em>`
- Adjacent identical inline elements are merged
- Empty text nodes are removed

## Security

All HTML output is sanitized by default. The built-in sanitizer:

- Allows only safe tags (`p`, `b`, `strong`, `i`, `em`, `u`, `s`, `h1`-`h6`, `ul`, `ol`, `li`, `a`, `blockquote`, `code`, `pre`, `br`, `div`, `span`)
- Strips all attributes except `href`/`target`/`rel` on links and `text-align` styles on block elements
- Validates link protocols (`http:`, `https:`, `mailto:` only)
- Restricts `target` to `_blank` only and auto-adds `rel="noopener noreferrer"`
- Plain text paste uses `document.createTextNode` to prevent injection

To disable sanitization:

```ts
const editor = useEditor({
  extensions: [Bold],
  sanitize: false,
});
```

## Browser Support

| Browser | Version |
|---|---|
| Chrome | 60+ |
| Firefox | 55+ |
| Safari | 12+ |
| Edge | 79+ |

## License

MIT
