import {
  useEditor,
  EditorProvider,
  EditorContent,
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
  useEditorContext,
  useIsActive,
  useCanUndo,
  useCanRedo,
  mark,
} from '../src';
import type { EditorInstance } from '../src';
import './demo.css';

const Highlight = mark({ name: 'highlight', tag: 'mark' });

function ToolbarButton({
  children,
  command,
  commandValue,
  label,
}: {
  children: React.ReactNode;
  command: string;
  commandValue?: unknown;
  label: string;
}) {
  const editor = useEditorContext();
  const active = useIsActive(editor, command, commandValue);

  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={label}
      onMouseDown={e => e.preventDefault()}
      onClick={() => editor.execute(command, commandValue)}
    >
      {children}
    </button>
  );
}

function LinkButton() {
  const editor = useEditorContext();
  const active = useIsActive(editor, 'link');

  const handleClick = () => {
    if (active) {
      editor.execute('removeLink');
    } else {
      const href = prompt('Enter URL:');
      if (href) {
        editor.execute('setLink', { href });
      }
    }
  };

  return (
    <button
      type="button"
      onMouseDown={e => e.preventDefault()}
      onClick={handleClick}
      aria-pressed={active}
      tabIndex={-1}
    >
      Link
    </button>
  );
}

function HistoryButtons({ editor }: { editor: EditorInstance }) {
  const canUndo = useCanUndo(editor);
  const canRedo = useCanRedo(editor);

  return (
    <>
      <button type="button" onClick={() => editor.history.undo()} disabled={!canUndo}>
        Undo
      </button>
      <button type="button" onClick={() => editor.history.redo()} disabled={!canRedo}>
        Redo
      </button>
    </>
  );
}

function EditorToolbar() {
  return (
    <div role="toolbar" aria-label="Text formatting" aria-orientation="horizontal">
      <ToolbarButton command="toggleBold" label="Bold">B</ToolbarButton>
      <ToolbarButton command="toggleItalic" label="Italic">I</ToolbarButton>
      <ToolbarButton command="toggleUnderline" label="Underline">U</ToolbarButton>
      <ToolbarButton command="toggleStrikethrough" label="Strikethrough">S</ToolbarButton>
      <span className="demo-toolbar-separator" />
      <ToolbarButton command="setHeading" commandValue={1} label="Heading 1">H1</ToolbarButton>
      <ToolbarButton command="setHeading" commandValue={2} label="Heading 2">H2</ToolbarButton>
      <ToolbarButton command="setHeading" commandValue={3} label="Heading 3">H3</ToolbarButton>
      <ToolbarButton command="removeHeading" label="Normal text">P</ToolbarButton>
      <span className="demo-toolbar-separator" />
      <ToolbarButton command="toggleOrderedList" label="Ordered list">OL</ToolbarButton>
      <ToolbarButton command="toggleUnorderedList" label="Unordered list">UL</ToolbarButton>
      <ToolbarButton command="toggleBlockquote" label="Blockquote">Quote</ToolbarButton>
      <ToolbarButton command="toggleCode" label="Inline code">Code</ToolbarButton>
      <ToolbarButton command="toggleCodeBlock" label="Code block">Pre</ToolbarButton>
      <ToolbarButton command="toggleHighlight" label="Highlight">Mark</ToolbarButton>
      <span className="demo-toolbar-separator" />
      <LinkButton />
      <span className="demo-toolbar-separator" />
      <ToolbarButton command="alignLeft" label="Align left">Left</ToolbarButton>
      <ToolbarButton command="alignCenter" label="Align center">Center</ToolbarButton>
      <ToolbarButton command="alignRight" label="Align right">Right</ToolbarButton>
    </div>
  );
}

export function App() {
  const editor = useEditor({
    extensions: [
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
      Highlight,
    ],
    initialValue: '<p>Hello World! Try editing this text.</p>',
    onChange: (html) => {
      console.log('HTML:', html);
    },
    onChangeJSON: (json) => {
      console.log('JSON:', json);
    },
  });

  return (
    <div className="demo-container">
      <header className="demo-header">
        <h1>yurich Demo</h1>
        <a href="https://github.com/YUJOO-LEE/yurich" target="_blank" rel="noopener noreferrer">
          GitHub
        </a>
      </header>
      <EditorProvider editor={editor}>
        <div className="demo-editor-wrapper">
          <div className="demo-toolbar-wrapper">
            <EditorToolbar />
          </div>
          <EditorContent
            className="demo-editor"
            ariaLabel="Rich text editor"
          />
        </div>
      </EditorProvider>
      <div className="demo-actions">
        <button type="button" onClick={() => console.log('HTML:', editor.getHTML())}>
          Log HTML
        </button>
        <button type="button" onClick={() => console.log('JSON:', editor.getJSON())}>
          Log JSON
        </button>
        <HistoryButtons editor={editor} />
      </div>
    </div>
  );
}
