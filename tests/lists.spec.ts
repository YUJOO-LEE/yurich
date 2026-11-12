import { test } from '@playwright/test';
import { openHarness, setContent, select, caret, execute, expectHTML } from './helpers';

test.beforeEach(({ page }) => openHarness(page));

test('selected paragraphs become one list', async ({ page }) => {
  await setContent(page, '<p>one</p><p>two</p><p>three</p>');
  await select(page, 'one', 'two');
  await execute(page, 'toggleUnorderedList');
  await expectHTML(page, '<ul><li>one</li><li>two</li></ul><p>three</p>');
});

test('toggling the list off affects only the selected item', async ({ page }) => {
  await setContent(page, '<ul><li>one</li><li>two</li><li>three</li></ul>');
  await caret(page, 'two');
  await execute(page, 'toggleUnorderedList');
  await expectHTML(page, '<ul><li>one</li></ul><p>two</p><ul><li>three</li></ul>');
});

test('toggling the list off with every item selected removes the list', async ({ page }) => {
  await setContent(page, '<ul>\n<li>one</li>\n<li>two</li>\n</ul>');
  await select(page, 'one', 'two');
  await execute(page, 'toggleUnorderedList');
  await expectHTML(page, '<p>one</p><p>two</p>');
});

test('a paragraph and list items selected together become one list', async ({ page }) => {
  await setContent(page, '<p>para</p><ul><li>one</li><li>two</li></ul>');
  await select(page, 'para', 'two');
  await execute(page, 'toggleOrderedList');
  await expectHTML(page, '<ol><li>para</li><li>one</li><li>two</li></ol>');
});

test('switching the list type affects only the selected item', async ({ page }) => {
  await setContent(page, '<ul><li>one</li><li>two</li><li>three</li></ul>');
  await caret(page, 'two');
  await execute(page, 'toggleOrderedList');
  await expectHTML(page, '<ul><li>one</li></ul><ol><li>two</li></ol><ul><li>three</li></ul>');
});

test('switching the list type with every item selected converts the list', async ({ page }) => {
  await setContent(page, '<ul><li>one</li><li>two</li></ul>');
  await select(page, 'one', 'two');
  await execute(page, 'toggleOrderedList');
  await expectHTML(page, '<ol><li>one</li><li>two</li></ol>');
});
