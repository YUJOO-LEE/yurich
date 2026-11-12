import { useEffect, useState } from 'react';
import {
  useEditor,
  EditorProvider,
  EditorContent,
  useEditorContext,
  useIsActive,
  useCanUndo,
  useCanRedo,
  toHTML,
  toJSON,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading,
  OrderedList,
  UnorderedList,
  Link,
  Blockquote,
  Code,
  CodeBlock,
  TextAlign,
} from '../../src';
import type { EditorInstance, Extension, DocumentJSON } from '../../src';
import { Highlight, Callout, Mention } from './extensions';

type Harness = {
  editors: Record<string, EditorInstance>;
  changes: Record<string, string[]>;
  jsonChanges: DocumentJSON[];
  commits: number;
  extensions: Extension[];
  toHTML: typeof toHTML;
  toJSON: typeof toJSON;
};

declare global {
  interface Window {
    harness: Harness;
  }
}

const extensions: Extension[] = [
  Bold, Italic, Underline, Strikethrough, Heading, OrderedList, UnorderedList,
  Link, Blockquote, Code, CodeBlock, TextAlign, Highlight, Callout, Mention,
];

window.harness = {
  editors: {},
  changes: { a: [], b: [] },
  jsonChanges: [],
  commits: 0,
  extensions,
  toHTML,
  toJSON,
};

const COMMANDS: [string, unknown?][] = [
  ['toggleBold'], ['toggleItalic'], ['toggleHighlight'],
  ['setHeading', 1], ['setHeading', 2], ['removeHeading'],
  ['toggleOrderedList'], ['toggleUnorderedList'], ['toggleBlockquote'],
  ['alignLeft'], ['alignCenter'],
];

function CommandButton({ command, value }: { command: string; value?: unknown }) {
  const editor = useEditorContext();
  const active = useIsActive(editor, command, value);
  return (
    <button
      type="button"
      data-command={value === undefined ? command : `${command}:${value}`}
      aria-pressed={active}
      onMouseDown={e => e.preventDefault()}
      onClick={() => editor.execute(command, value)}
    >
      {command}
    </button>
  );
}

function HistoryButtons({ editor }: { editor: EditorInstance }) {
  const canUndo = useCanUndo(editor);
  const canRedo = useCanRedo(editor);
  return (
    <>
      <button type="button" id="undo" disabled={!canUndo} onClick={() => editor.history.undo()}>undo</button>
      <button type="button" id="redo" disabled={!canRedo} onClick={() => editor.history.redo()}>redo</button>
    </>
  );
}

export function App() {
  const [show, setShow] = useState(true);

  const a = useEditor({
    extensions,
    initialValue: '<p>Hello World</p>',
    onChange: html => window.harness.changes.a.push(html),
    onChangeJSON: json => window.harness.jsonChanges.push(json),
  });
  const b = useEditor({
    extensions: [Bold],
    initialValue: '<p>second editor</p>',
    onChange: html => window.harness.changes.b.push(html),
  });

  useEffect(() => {
    window.harness.editors = { a, b };
  }, [a, b]);
  useEffect(() => {
    window.harness.commits++;
  });

  return (
    <>
      <EditorProvider editor={a}>
        <div id="toolbar-a">
          {COMMANDS.map(([command, value]) => (
            <CommandButton key={`${command}:${value}`} command={command} value={value} />
          ))}
        </div>
        {show && <EditorContent className="editor-a" ariaLabel="A" />}
      </EditorProvider>
      <HistoryButtons editor={a} />
      <button type="button" id="toggle" onClick={() => setShow(v => !v)}>toggle</button>
      <EditorProvider editor={b}>
        <div id="toolbar-b">
          <CommandButton command="toggleBold" />
        </div>
        <EditorContent className="editor-b" ariaLabel="B" />
      </EditorProvider>
      <p id="outside">outside text</p>
    </>
  );
}
