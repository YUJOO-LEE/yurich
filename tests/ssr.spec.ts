import { test, expect } from '@playwright/test';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import {
  useEditor, EditorProvider, EditorContent, useEditorContext, useIsActive, useCanUndo, Bold,
} from '../src';

const Button = () => {
  const editor = useEditorContext();
  const active = useIsActive(editor, 'toggleBold');
  const canUndo = useCanUndo(editor);
  return createElement('button', { 'aria-pressed': active, disabled: !canUndo }, 'B');
};

const App = () => {
  const editor = useEditor({ extensions: [Bold], initialValue: '<p>hi</p>' });
  return createElement(EditorProvider, { editor, children: [
    createElement(Button, { key: 'button' }),
    createElement(EditorContent, { key: 'content', className: 'editor' }),
  ] });
};

test('renders on the server without a DOM', () => {
  const markup = renderToString(createElement(App));
  expect(markup).toContain('aria-pressed="false"');
});
