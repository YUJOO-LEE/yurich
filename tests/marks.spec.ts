import { test, expect } from '@playwright/test';
import { openHarness, setContent, select, caret, execute, expectHTML, html, settle } from './helpers';

test.beforeEach(({ page }) => openHarness(page));

test('bold wraps the selected word', async ({ page }) => {
  await setContent(page, '<p>hello world</p>');
  await select(page, 'world');
  await execute(page, 'toggleBold');
  await expectHTML(page, '<p>hello <strong>world</strong></p>');
});

test('bold across two paragraphs wraps inside each paragraph', async ({ page }) => {
  await setContent(page, '<p>one two</p><p>three four</p>');
  await select(page, 'two', 'three');
  await execute(page, 'toggleBold');
  await expectHTML(page, '<p>one <strong>two</strong></p><p><strong>three</strong> four</p>');
});

test('bold over a partly bold selection leaves one strong', async ({ page }) => {
  await setContent(page, '<p>a<strong>b</strong>c</p>');
  await select(page, 'a', 'c');
  await execute(page, 'toggleBold');
  await expectHTML(page, '<p><strong>abc</strong></p>');
});

test('toggling a fully bold selection across paragraphs removes bold', async ({ page }) => {
  await setContent(page, '<p><strong>one</strong></p><p><strong>two</strong></p>');
  await select(page, 'one', 'two');
  await execute(page, 'toggleBold');
  await expectHTML(page, '<p>one</p><p>two</p>');
});

test('removing bold from the middle keeps it on both sides', async ({ page }) => {
  await setContent(page, '<p>a<strong>bcd</strong>e</p>');
  await select(page, { text: 'bcd', at: 1 }, { text: 'bcd', at: 2 });
  await execute(page, 'toggleBold');
  await expectHTML(page, '<p>a<strong>b</strong>c<strong>d</strong>e</p>');
});

test('removing bold keeps the other marks on the text', async ({ page }) => {
  await setContent(page, '<p><strong><em>bcd</em></strong></p>');
  await select(page, { text: 'bcd', at: 1 }, { text: 'bcd', at: 2 });
  await execute(page, 'toggleBold');
  await expectHTML(page, '<p><strong><em>b</em></strong><em>c</em><strong><em>d</em></strong></p>');
});

test('bold with only a caret changes nothing', async ({ page }) => {
  await setContent(page, '<p>abc</p>');
  await caret(page, 'abc');
  await execute(page, 'toggleBold');
  await expectHTML(page, '<p>abc</p>');
});

test('a selection ending at the start of the next paragraph does not touch it', async ({ page }) => {
  await setContent(page, '<p>one</p><p>two</p>');
  await page.evaluate(() => {
    const root = document.querySelector('.editor-a')!;
    window.getSelection()!.setBaseAndExtent(root.children[0].firstChild!, 0, root.children[1], 0);
  });
  await execute(page, 'toggleBold');
  await expectHTML(page, '<p><strong>one</strong></p><p>two</p>');
});

test('neighbouring custom marks merge like built-in ones', async ({ page }) => {
  await setContent(page, '<p>abcdef</p>');
  await select(page, { text: 'abcdef', at: 0 }, { text: 'abcdef', at: 2 });
  await execute(page, 'toggleHighlight');
  await select(page, { text: 'cdef', at: 0 }, { text: 'cdef', at: 2 });
  await execute(page, 'toggleHighlight');
  await expectHTML(page, '<p><mark>abcd</mark>ef</p>');
});

test('a mark is active only when the whole selection has it', async ({ page }) => {
  const isBold = () => page.evaluate(() => window.harness.editors.a.isActive('toggleBold'));
  await setContent(page, '<p>a<strong>bc</strong>d</p>');
  await caret(page, 'bc', 1);
  expect(await isBold()).toBe(true);
  await select(page, 'bc');
  expect(await isBold()).toBe(true);
  await select(page, 'a', 'bc');
  expect(await isBold()).toBe(false);
});

test('link wraps the selection and rejects unsafe protocols', async ({ page }) => {
  await setContent(page, '<p>hello world</p>');
  await select(page, 'world');
  await execute(page, 'setLink', { href: 'javascript:alert(1)' });
  await expectHTML(page, '<p>hello world</p>');
  await execute(page, 'setLink', { href: 'https://example.com' });
  await expectHTML(page, '<p>hello <a href="https://example.com">world</a></p>');
});

test('link with only a caret inserts the address as the link text', async ({ page }) => {
  await setContent(page, '<p>hello</p>');
  await caret(page, 'hello');
  await execute(page, 'setLink', { href: 'https://example.com' });
  await expectHTML(page, '<p>hello<a href="https://example.com">https://example.com</a></p>');
});

test('removeLink with the caret inside removes the whole link', async ({ page }) => {
  await setContent(page, '<p>a <a href="https://example.com">link here</a> b</p>');
  await caret(page, 'link here', 3);
  await execute(page, 'removeLink');
  await settle(page);
  expect(await html(page)).toBe('<p>a link here b</p>');
});
