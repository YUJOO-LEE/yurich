import { test, expect } from '@playwright/test';
import { openHarness, setContent, select, caret, expectHTML, html } from './helpers';

test.beforeEach(({ page }) => openHarness(page));

test('Enter splits a paragraph and Backspace joins it back', async ({ page }) => {
  await setContent(page, '<p>abcd</p>');
  await caret(page, 'abcd', 2);
  await page.keyboard.press('Enter');
  await expectHTML(page, '<p>ab</p><p>cd</p>');
  await page.keyboard.press('Backspace');
  await expectHTML(page, '<p>abcd</p>');
});

test('lines typed into an empty editor are paragraphs', async ({ page }) => {
  await setContent(page, '');
  await page.keyboard.type('one');
  await page.keyboard.press('Enter');
  await page.keyboard.type('two');
  await expect.poll(() => html(page)).toMatch(/^<p>one<\/p><p>two(<br>)?<\/p>$/);
});

test('lines the browser wrote as <div> and <b> are rewritten to the schema tags', async ({ page }) => {
  await setContent(page, '<div>a</div><div><b>b</b><font color="red">c</font></div>');
  await expectHTML(page, '<p>a</p><p><strong>b</strong>c</p>');
});

test('the keyboard shortcut toggles the mark', async ({ page }) => {
  await setContent(page, '<p>hello world</p>');
  await select(page, 'world');
  const mod = await page.evaluate(() => (/Mac|iPhone|iPad/.test(navigator.userAgent) ? 'Meta' : 'Control'));
  await page.keyboard.press(`${mod}+b`);
  await expectHTML(page, '<p>hello <strong>world</strong></p>');
});

test('shortcuts are ignored while an IME composition is in progress', async ({ page }) => {
  await setContent(page, '<p>hello world</p>');
  await select(page, 'world');
  await page.evaluate(() => {
    document.querySelector('.editor-a')!.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'b', ctrlKey: true, metaKey: true, isComposing: true, bubbles: true, cancelable: true,
    }));
  });
  await expectHTML(page, '<p>hello world</p>');
});

test('dropping content into the editor is refused', async ({ page }) => {
  const prevented = await page.evaluate(() => {
    const event = new DragEvent('drop', { bubbles: true, cancelable: true });
    document.querySelector('.editor-a')!.dispatchEvent(event);
    return event.defaultPrevented;
  });
  expect(prevented).toBe(true);
});
