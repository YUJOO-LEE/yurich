import { test, expect } from '@playwright/test';
import {
  openHarness, setContent, select, caret, execute, expectHTML, undoKey, redoKey, newHistoryEntry,
} from './helpers';

test.beforeEach(({ page }) => openHarness(page));

test('undo and redo step through typing, and the caret comes back with them', async ({ page }) => {
  await setContent(page, '<p>abc</p><p>def</p>');
  await caret(page, 'def', 1);
  await newHistoryEntry(page);
  await page.keyboard.type('X');
  await newHistoryEntry(page);
  await page.keyboard.type('Y');
  await newHistoryEntry(page);

  await undoKey(page);
  await expectHTML(page, '<p>abc</p><p>dXef</p>');
  await page.keyboard.type('Q');
  await expectHTML(page, '<p>abc</p><p>dXQef</p>');
});

test('redo works with Shift and with an uppercase key', async ({ page }) => {
  await setContent(page, '<p>abc</p>');
  await caret(page, 'abc');
  await newHistoryEntry(page);
  await page.keyboard.type('X');
  await newHistoryEntry(page);

  await undoKey(page);
  await expectHTML(page, '<p>abc</p>');
  await redoKey(page);
  await expectHTML(page, '<p>abcX</p>');

  await undoKey(page);
  await page.evaluate(() => {
    document.querySelector('.editor-a')!.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Z', ctrlKey: true, shiftKey: true, bubbles: true, cancelable: true,
    }));
  });
  await expectHTML(page, '<p>abcX</p>');
});

test('a command is one undo step', async ({ page }) => {
  await setContent(page, '<p>hello world</p>');
  await select(page, 'world');
  await newHistoryEntry(page);
  await execute(page, 'toggleBold');
  await newHistoryEntry(page);
  await undoKey(page);
  await expectHTML(page, '<p>hello world</p>');
  await redoKey(page);
  await expectHTML(page, '<p>hello <strong>world</strong></p>');
});

test('a command right after typing is undone on its own', async ({ page }) => {
  await setContent(page, '<p>hello world</p>');
  await caret(page, 'hello world');
  await newHistoryEntry(page);
  await page.keyboard.type('!!');
  await select(page, 'world!!');
  await execute(page, 'toggleBold');
  await undoKey(page);
  await expectHTML(page, '<p>hello world!!</p>');
  await undoKey(page);
  await expectHTML(page, '<p>hello world</p>');
});

test('the undo and redo buttons follow the history', async ({ page }) => {
  await setContent(page, '<p>abc</p>');
  await caret(page, 'abc');
  await newHistoryEntry(page);
  await page.keyboard.type('X');
  await expect(page.locator('#undo')).toBeEnabled();
  await expect(page.locator('#redo')).toBeDisabled();
  await newHistoryEntry(page);
  await undoKey(page);
  await expect(page.locator('#redo')).toBeEnabled();
});
