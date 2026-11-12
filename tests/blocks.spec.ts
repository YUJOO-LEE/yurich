import { test, expect } from '@playwright/test';
import { openHarness, setContent, select, caret, execute, expectHTML, html, getHTML, getJSON } from './helpers';

test.beforeEach(({ page }) => openHarness(page));

test('heading changes the block under the caret', async ({ page }) => {
  await setContent(page, '<p>title</p><p>body</p>');
  await caret(page, 'title');
  await execute(page, 'setHeading', 2);
  await expectHTML(page, '<h2>title</h2><p>body</p>');
  await execute(page, 'removeHeading');
  await expectHTML(page, '<p>title</p><p>body</p>');
});

test('heading applies to every selected block', async ({ page }) => {
  await setContent(page, '<p>one</p><p>two</p><p>three</p>');
  await select(page, 'one', 'two');
  await execute(page, 'setHeading', 1);
  await expectHTML(page, '<h1>one</h1><h1>two</h1><p>three</p>');
});

test('a heading level outside 1-6 is ignored', async ({ page }) => {
  await setContent(page, '<p>title</p>');
  await caret(page, 'title');
  await execute(page, 'setHeading', 7);
  await expectHTML(page, '<p>title</p>');
});

test('heading works in an empty editor and typing lands inside it', async ({ page }) => {
  await setContent(page, '');
  await execute(page, 'setHeading', 1);
  await page.keyboard.type('Title');
  await expect.poll(() => html(page)).toMatch(/^<h1>Title(<br>)?<\/h1>$/);
});

test('text typed into an empty editor ends up in a paragraph', async ({ page }) => {
  await setContent(page, '');
  await page.keyboard.type('hello');
  await expect.poll(() => html(page)).toMatch(/^<p>hello(<br>)?<\/p>$/);
  await execute(page, 'setHeading', 2);
  await expect.poll(() => html(page)).toMatch(/^<h2>hello(<br>)?<\/h2>$/);
});

test('blockquote toggles on and off', async ({ page }) => {
  await setContent(page, '<p>quote</p>');
  await caret(page, 'quote');
  await execute(page, 'toggleBlockquote');
  await expectHTML(page, '<blockquote>quote</blockquote>');
  await execute(page, 'toggleBlockquote');
  await expectHTML(page, '<p>quote</p>');
});

test('alignment is kept in HTML and JSON, on list items too', async ({ page }) => {
  await setContent(page, '<p>para</p><ul><li>item</li></ul>');
  await select(page, 'para', 'item');
  await execute(page, 'alignCenter');
  expect(await getHTML(page)).toBe(
    '<p style="text-align: center">para</p><ul><li style="text-align: center">item</li></ul>',
  );
  const json = await getJSON(page);
  expect(json.content[0].attrs).toEqual({ textAlign: 'center' });
});

test('a heading inside a list takes the item out and splits the list', async ({ page }) => {
  await setContent(page, '<ol><li>one</li><li>two</li><li>three</li></ol>');
  await caret(page, 'two');
  await execute(page, 'setHeading', 1);
  await expectHTML(page, '<ol><li>one</li></ol><h1>two</h1><ol><li>three</li></ol>');
});
