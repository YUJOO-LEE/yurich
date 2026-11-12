import { test, expect, type Page } from '@playwright/test';
import { openHarness, setContent, caret, expectHTML, getHTML, settle, newHistoryEntry, undoKey } from './helpers';

test.beforeEach(({ page }) => openHarness(page));

const setHTML = async (page: Page, html: string, options?: { history?: boolean }) => {
  await page.evaluate(([value, opts]) => {
    window.harness.editors.a.setHTML(value as string, opts as { history?: boolean } | undefined);
  }, [html, options] as const);
  await settle(page);
};

const canUndo = (page: Page) => page.evaluate(() => window.harness.editors.a.history.canUndo());

test('setHTML replaces the document as one undo step', async ({ page }) => {
  await setContent(page, '<p>old</p>');
  await newHistoryEntry(page);
  await setHTML(page, '<h1>New</h1><p>body</p>');
  await expectHTML(page, '<h1>New</h1><p>body</p>');

  await caret(page, 'body');
  await undoKey(page);
  await expectHTML(page, '<p>old</p>');
});

test('setHTML with history off starts a fresh history', async ({ page }) => {
  await setContent(page, '<p>old</p>');
  await newHistoryEntry(page);
  await setHTML(page, '<p>loaded</p>', { history: false });
  await expectHTML(page, '<p>loaded</p>');
  expect(await canUndo(page)).toBe(false);
  await expect(page.locator('#undo')).toBeDisabled();
});

test('setHTML goes through the sanitizer and the document rules', async ({ page }) => {
  await setHTML(page, 'loose <b>text</b><img src=x onerror="window.__xss=1"><script>window.__xss=2</script>');
  await page.waitForTimeout(100);
  await expectHTML(page, '<p>loose <strong>text</strong></p>');
  expect(await page.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined();
});

test('setHTML reports the change once', async ({ page }) => {
  await page.waitForTimeout(50);
  const before = await page.evaluate(() => window.harness.changes.a.length);
  await setHTML(page, '<p>reported</p>', { history: false });
  await expect.poll(() => page.evaluate(() => window.harness.changes.a.length)).toBe(before + 1);
  expect(await page.evaluate(() => window.harness.changes.a.at(-1))).toBe('<p>reported</p>');
});

test('setHTML works while the editable area is unmounted', async ({ page }) => {
  await page.click('#toggle');
  await expect(page.locator('.editor-a')).toHaveCount(0);
  await setHTML(page, '<p>while hidden</p>');
  expect(await getHTML(page)).toBe('<p>while hidden</p>');
  await page.click('#toggle');
  await expectHTML(page, '<p>while hidden</p>');
});
