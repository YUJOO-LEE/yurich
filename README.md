# yurich

[![GitHub](https://img.shields.io/github/stars/YUJOO-LEE/yurich?style=flat)](https://github.com/YUJOO-LEE/yurich)
[![npm](https://img.shields.io/npm/v/yurich)](https://www.npmjs.com/package/yurich)

A headless rich text editor for React built on native `contentEditable` + Selection API.

## Why yurich?

- **Zero dependencies** — Only React as a peer dependency. No ProseMirror, no Slate, no heavy document model.
- **Native contentEditable** — Uses the browser's built-in editing with the Selection API directly. Does **not** use `document.execCommand`.
- **HTML-native model** — The DOM *is* the document. No separate document model to sync.
- **Schema from extensions** — The extensions you enable define which tags exist. Everything else is removed on paste, on load, and in the output.
- **Headless** — No default styles or UI. Full control over your toolbar and layout.
- **Accessible** — ARIA roles and keyboard shortcuts built in.
- **IME/Composition support** — The document is left alone while a CJK or other IME composition is in progress.

## Installation

```bash
npm install yurich
```

React 18+ is a peer dependency:

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
  useIsActive,
} from 'yurich';

function ToolbarButton({ command, label, children }: {
  command: string;
  label: string;
  children: React.ReactNode;
}) {
  const editor = useEditorContext();
  const active = useIsActive(editor, command);
  return (
    <button
      aria-pressed={active}
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

`onMouseDown={e => e.preventDefault()}` keeps the selection in the editor when a toolbar button is clicked.

## Extensions

| Extension | Commands | Keyboard Shortcut |
|---|---|---|
| `Bold` | `toggleBold` | `Mod+B` |
| `Italic` | `toggleItalic` | `Mod+I` |
| `Underline` | `toggleUnderline` | `Mod+U` |
| `Strikethrough` | `toggleStrikethrough` | `Mod+Shift+S` |
| `Code` | `toggleCode` | — |
| `Link` | `setLink`, `removeLink` | — |
| `Heading` | `setHeading`, `removeHeading` | — |
| `OrderedList` | `toggleOrderedList` | — |
| `UnorderedList` | `toggleUnorderedList` | — |
| `Blockquote` | `toggleBlockquote` | — |
| `CodeBlock` | `toggleCodeBlock` | — |
| `TextAlign` | `alignLeft`, `alignCenter`, `alignRight`, `alignJustify` | — |

> `Mod` is `Cmd` on macOS and `Ctrl` on Windows/Linux.

An editor keeps only what its extensions declare. With `extensions: [Bold]`, pasted italic text loses the italic and a pasted heading becomes a paragraph.

### Command values

```ts
// Heading level 1-6. Other values are ignored.
editor.execute('setHeading', 2);

// Only http:, https: and mailto: addresses are accepted.
// With a selection the text becomes the link; with only a caret the address is inserted as the link text.
editor.execute('setLink', { href: 'https://example.com' });
```

### How commands behave

- A mark command (`toggleBold`, …) needs a selection. With only a caret it does nothing.
- A mark is active only when all of the selected text has it. Toggling a partly bold selection makes all of it bold.
- Removing a mark from part of a marked run keeps the mark on the rest.
- Block commands apply to every selected block. A selection that ends at the very start of a block does not include that block.
- List commands apply to the selected items only. Turning one item of a list off, or into another list type, splits the list around it.
- A heading, blockquote or code block applied inside a list takes the item out of the list.

## API Reference

### `useEditor(options)`

Creates an editor instance that lives as long as the component.

| Option | Type | Default | Description |
|---|---|---|---|
| `extensions` | `Extension[]` | — | Extensions to enable (required) |
| `initialValue` | `string` | `undefined` | Initial HTML content. Read once; replace the content later with `setHTML`. |
| `onChange` | `(html: string) => void` | `undefined` | Called when the content changes (HTML) |
| `onChangeJSON` | `(json: DocumentJSON) => void` | `undefined` | Called when the content changes (JSON) |
| `sanitize` | `boolean` | `true` | Sanitize the output of `getHTML()` and `onChange`. Read once. |
| `historyLimit` | `number` | `100` | Max undo steps. Read once. |

`onChange` and `onChangeJSON` are called at most once per animation frame, and only when the content actually changed.

### `EditorInstance`

| Member | Signature | Description |
|---|---|---|
| `execute` | `(command: string, value?: unknown) => void` | Run a command by name |
| `isActive` | `(name: string, value?: unknown) => boolean` | Whether a command or extension is active at the selection, e.g. `isActive('setHeading', 2)` |
| `getHTML` | `() => string` | The content as sanitized HTML |
| `getJSON` | `() => DocumentJSON` | The content as JSON |
| `setHTML` | `(html: string, options?: { history?: boolean }) => void` | Replace the whole content. See below. |
| `history.undo` / `history.redo` | `() => void` | Undo / redo |
| `history.canUndo` / `history.canRedo` | `() => boolean` | Whether undo / redo is available |
| `subscribe` | `(listener: () => void) => () => void` | Call `listener` whenever content, selection, or history changes. Returns an unsubscribe function. |
| `el` | `HTMLElement \| null` | The editable element. `null` until `EditorContent` first mounts. |

The instance itself never changes, so reading `editor.isActive(...)` or `editor.history.canUndo()` during render does not re-render the component. Read them through the hooks below.

The methods for writing extensions are listed under [Custom Extensions](#custom-extensions).

### Replacing the content

`setHTML` replaces the whole document, for content that arrives after the editor is created or for switching to another document.

```ts
editor.setHTML(post.html);                     // one undo step: undo brings back the previous content
editor.setHTML(post.html, { history: false }); // clears the undo history: loading a document, switching documents
```

The HTML goes through the sanitizer and the document rules, and `onChange` is called. Before `EditorContent` first mounts, `setHTML` sets the initial content.

### `useIsActive`, `useCanUndo`, `useCanRedo`

Each hook subscribes the component to one value and re-renders it only when that value changes. Moving the caret re-renders the buttons whose state flipped and nothing else.

```tsx
const isBold = useIsActive(editor, 'toggleBold');
const isH2 = useIsActive(editor, 'setHeading', 2);
const canUndo = useCanUndo(editor);
const canRedo = useCanRedo(editor);
```

`editor` comes from `useEditor` or `useEditorContext`, so the hooks work inside and outside an `EditorProvider`.

### `useEditorState(editor, selector)`

The hook the three above are built on, for state they do not cover.

```tsx
const isEmpty = useEditorState(editor, e => (e.el?.textContent ?? '') === '');
```

Return a primitive from the selector. An object is a new value on every change and re-renders every time.

### `EditorProvider` and `useEditorContext`

`EditorProvider` gives the editor to the components below it. `useEditorContext` reads it.

```tsx
<EditorProvider editor={editor}>
  {/* Toolbar, EditorContent, etc. */}
</EditorProvider>
```

### `EditorContent`

Shows the editable area. Must be inside an `EditorProvider`.

| Prop | Type | Description |
|---|---|---|
| `className` | `string` | CSS class for the editable element |
| `ariaLabel` | `string` | Accessible label |
| `ariaDescribedBy` | `string` | ID of a describing element |

The editable element belongs to the editor instance, not to `EditorContent`. Unmounting `EditorContent` and mounting it again keeps the content and the undo history, and `getHTML()`, `getJSON()` and undo keep working in between.

Dropping content into the editor is disabled, because it would bypass the sanitizer.

### Serializers

Convert any element with the rules of a set of extensions:

```ts
import { toHTML, toJSON, Bold, Link } from 'yurich';

const html = toHTML(element, [Bold, Link]);
const json = toJSON(element, [Bold, Link]);
```

## Output Formats

### HTML

```ts
editor.getHTML();
// '<p>Hello <strong>World</strong></p>'
```

### JSON

```ts
editor.getJSON();
```

```json
{
  "type": "doc",
  "content": [
    {
      "type": "paragraph",
      "content": [
        { "type": "text", "text": "Hello " },
        { "type": "text", "text": "World", "marks": [{ "type": "bold" }] }
      ]
    }
  ]
}
```

**Node types:** `paragraph`, `heading` (`attrs.level`), `blockquote`, `codeBlock`, `orderedList`, `unorderedList`, `listItem`, `text`. A block with a text alignment carries `attrs.textAlign`.

**Mark types:** `bold`, `italic`, `underline`, `strikethrough`, `code`, `link` (`attrs.href`, plus `attrs.target` and `attrs.rel` when the link opens in a new tab), and the types of custom marks.

A line break inside a block is a text node `"\n"`.

`getJSON()` reuses the nodes of blocks that did not change between calls. Treat the result as immutable.

## Custom Extensions

A toggled inline format or block type is one call:

```ts
import { mark, block } from 'yurich';

// <mark>, command `toggleHighlight`, JSON mark type `highlight`
const Highlight = mark({ name: 'highlight', tag: 'mark', shortcut: 'Mod+Shift+H' });

// <aside>, command `toggleCallout`, JSON node type `callout`
const Callout = block({ name: 'callout', tag: 'aside' });
```

The command is `toggle` + the capitalized name. A tag declared this way is part of the editor's schema: it survives paste, `initialValue`, undo and `getHTML()`, and appears in `getJSON()`.

For anything else, write the extension object:

```ts
import type { Extension } from 'yurich';

const Mention: Extension = {
  name: 'mention',
  marks: [{
    tag: 'cite',
    type: 'mention',
    attrs: { 'data-id': value => (value && /^\d+$/.test(value) ? value : null) },
  }],
  commands: {
    setMention: (editor, value) => editor.setMark('cite', { 'data-id': String(value) }),
    removeMention: editor => editor.removeMark('cite'),
  },
  isActive: editor => editor.isMarkActive('cite'),
};
```

**`Extension`**

| Field | Type | Description |
|---|---|---|
| `name` | `string` | Unique name |
| `marks` | `MarkSpec[]` | Inline tags: `tag`, JSON `type`, optional `aliases` (tags rewritten to `tag`) and `attrs` |
| `blocks` | `BlockSpec[]` | Block tags: `tag`, JSON `type`, optional `aliases` and fixed JSON `attrs` |
| `blockStyles` | `Record<string, readonly string[]>` | CSS properties allowed on blocks and the values each may take |
| `commands` | `Record<string, CommandFn>` | Command name → `(editor, value) => void` |
| `keyboardShortcuts` | `Record<string, string>` | Key combo → command name |
| `isActive` | `(editor, command?, value?) => boolean` | Whether the extension is active at the selection |

Tags are lowercase. An attribute is kept only when the mark declares a rule for it: the rule receives the current value (or `null`) and the element, and returns the value to write or `null` to leave the attribute out.

**Editor methods for commands**

| Method | Description |
|---|---|
| `toggleMark(tag)` | Add the mark to the selection, or remove it when all of the selection has it |
| `setMark(tag, attrs?, text?)` | Add the mark with attributes. With only a caret, `text` is inserted and marked. |
| `removeMark(tag)` | Remove the mark from the selection. With only a caret, remove the whole mark around it. |
| `isMarkActive(tag)` | Whether all of the selected text has the mark |
| `setBlock(tag)` / `toggleBlock(tag)` | Change the selected blocks to `tag` / toggle between `tag` and paragraph |
| `isBlockActive(tag)` | Whether every selected block is a `tag` |
| `toggleList(tag)` / `isListActive(tag)` | `'ol'` or `'ul'` |
| `setBlockStyle(property, value)` / `getBlockStyle(property)` | A style declared in `blockStyles` |
| `change(edit)` | Run your own DOM edit on `editor.el`. The document is normalized, recorded in history and reported afterwards. |

All of them act on the selection inside this editor and do nothing when the selection is elsewhere.

## Internals

### Document rules

After every change — typing, paste, a command, or your own edit of `editor.el` — the changed blocks are brought back to these rules:

- The editable element holds only blocks. Loose text is wrapped in `<p>`, and `<div>` lines become `<p>`.
- Every tag is in the schema and written in its canonical form (`<b>` → `<strong>`, `<i>` → `<em>`, `<del>` → `<s>`). Other tags are unwrapped.
- A mark is never nested in itself, never empty, and never split into identical neighbours.
- A list holds only items, is never empty, and is joined with an identical list next to it.

### History

Typing is grouped: keystrokes less than 300ms apart are one undo step. A command or a paste is always a step of its own. Undo and redo restore the selection along with the content.

Restored content goes through the sanitizer.

## Security

HTML enters the document in four places — `initialValue`, `setHTML`, paste, and undo/redo — and all of them go through the sanitizer. `getHTML()` and `onChange` sanitize again on the way out.

The sanitizer rebuilds the content from the schema instead of removing what looks dangerous:

- Only the tags of the enabled extensions come out, plus `<p>` and `<br>`.
- Only declared attributes come out: `href`, `target` and `rel` on links, and `text-align` on blocks with `TextAlign`. No `on*` handlers, `class`, `id` or other styles.
- Link addresses must start with `http://`, `https://` or `mailto:`. `target` may only be `_blank`, and then `rel="noopener noreferrer"` is set.
- `<script>`, `<style>`, `<iframe>`, `<svg>`, `<math>`, `<noscript>`, `<title>`, `<audio>`, `<video>` and similar tags are removed together with their content, even when an extension declares them.
- Other unknown tags are removed but their text is kept. An unknown tag that starts a line in HTML (`<td>`, `<section>`, …) becomes a paragraph.
- Plain text is pasted as text nodes and never parsed as HTML.

`sanitize: false` makes `getHTML()` and `onChange` return the DOM as it is. Sanitize on the server if you use it.

## Browser Support

| Browser | Version |
|---|---|
| Chrome | 85+ |
| Firefox | 79+ |
| Safari | 14+ |
| Edge | 85+ |

## Development

```bash
yarn dev         # demo
yarn lint
yarn typecheck
yarn test        # Playwright: Chromium, WebKit, Firefox, and iPhone / Pixel emulation
```

The first test run needs the browsers: `yarn playwright install`.

## License

MIT
