import { test, expect } from '@playwright/test';
import {
  openHarness, setContent, select, caret, expectHTML, getHTML, html, settle, newHistoryEntry,
} from './helpers';

test.beforeEach(({ page }) => openHarness(page));

const button = (command: string, toolbar = 'a') => `#toolbar-${toolbar} [data-command="${command}"]`;

test('toolbar state follows the caret and clears when the selection leaves', async ({ page }) => {
  await setContent(page, '<p>a<strong>bold</strong></p>');
  await caret(page, 'bold', 2);
  await expect(page.locator(button('toggleBold'))).toHaveAttribute('aria-pressed', 'true');
  await caret(page, 'a');
  await expect(page.locator(button('toggleBold'))).toHaveAttribute('aria-pressed', 'false');
  await caret(page, 'bold', 2);
  await page.click('#outside');
  await expect(page.locator(button('toggleBold'))).toHaveAttribute('aria-pressed', 'false');
});

test('clicking a toolbar button applies the command to the kept selection', async ({ page }) => {
  await setContent(page, '<p>hello world</p>');
  await select(page, 'world');
  await page.click(button('toggleBold'));
  await expectHTML(page, '<p>hello <strong>world</strong></p>');
  await expect(page.locator(button('toggleBold'))).toHaveAttribute('aria-pressed', 'true');
});

test('typing does not re-render the component that owns the editor', async ({ page }) => {
  await setContent(page, '<p>abc</p>');
  await caret(page, 'abc');
  await settle(page);
  const before = await page.evaluate(() => window.harness.commits);
  await page.keyboard.type('hello');
  await page.keyboard.press('ArrowLeft');
  await settle(page);
  expect(await page.evaluate(() => window.harness.commits)).toBe(before);
});

test('a command without a selection in the editor reports no change', async ({ page }) => {
  await setContent(page, '<p>abc</p>');
  await page.waitForTimeout(50);
  await page.evaluate(() => window.getSelection()!.removeAllRanges());
  const before = await page.evaluate(() => window.harness.changes.a.length);
  await page.evaluate(() => window.harness.editors.a.execute('toggleBold'));
  await page.waitForTimeout(100);
  expect(await page.evaluate(() => window.harness.changes.a.length)).toBe(before);
});

test('one editor never edits another', async ({ page }) => {
  await select(page, 'second', 'second', 'b');
  await page.click(button('toggleBold', 'a'));
  await settle(page);
  expect(await html(page, 'b')).toBe('<p>second editor</p>');
  expect(await html(page, 'a')).toBe('<p>Hello World</p>');
  await page.click(button('toggleBold', 'b'));
  await expectHTML(page, '<p><strong>second</strong> editor</p>', 'b');
});

test('the document survives unmounting the editable area', async ({ page }) => {
  await setContent(page, '<p>abc</p>');
  await caret(page, 'abc');
  await newHistoryEntry(page);
  await page.keyboard.type('X');
  await newHistoryEntry(page);

  await page.click('#toggle');
  await expect(page.locator('.editor-a')).toHaveCount(0);
  expect(await getHTML(page)).toBe('<p>abcX</p>');

  await page.click('#undo');
  expect(await getHTML(page)).toBe('<p>abc</p>');

  await page.click('#toggle');
  await expectHTML(page, '<p>abc</p>');
});

test('nothing is reported while an IME composition is in progress', async ({ page }) => {
  await setContent(page, '<p>안녕</p>');
  await caret(page, '안녕');
  await page.waitForTimeout(50);
  const count = () => page.evaluate(() => window.harness.changes.a.length);
  const before = await count();

  await page.evaluate(() => {
    document.querySelector('.editor-a')!.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    document.execCommand('insertText', false, '하');
  });
  await page.waitForTimeout(100);
  expect(await count()).toBe(before);

  await page.evaluate(() => {
    document.querySelector('.editor-a')!.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: '하' }));
  });
  await expect.poll(count).toBe(before + 1);
  expect(await getHTML(page)).toBe('<p>안녕하</p>');
});

test('tapping a toolbar button applies the command to the kept selection', async ({ page, isMobile, browserName }) => {
  test.skip(!isMobile, 'touch only');
  // Playwright's emulated WebKit never delivers the tap, even on a plain button
  test.skip(browserName === 'webkit', 'tap is not delivered in emulated WebKit');
  await setContent(page, '<p>hello world</p>');
  await select(page, 'world');
  await page.tap(button('toggleBold'));
  await expectHTML(page, '<p>hello <strong>world</strong></p>');
});
