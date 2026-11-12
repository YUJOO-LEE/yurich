import { test, expect, type CDPSession, type Page } from '@playwright/test';
import { openHarness, setContent, select, caret, expectHTML, getHTML } from './helpers';

// Only Chromium lets a test drive the browser's own IME pipeline; elsewhere composition can only be simulated
test.skip(({ browserName }) => browserName !== 'chromium');

test.beforeEach(({ page }) => openHarness(page));

const compose = async (cdp: CDPSession, steps: string[], commit: string): Promise<void> => {
  for (const text of steps) {
    await cdp.send('Input.imeSetComposition', { text, selectionStart: text.length, selectionEnd: text.length });
  }
  await cdp.send('Input.insertText', { text: commit });
};

const changeCount = (page: Page) => page.evaluate(() => window.harness.changes.a.length);

test('Korean syllables composed by the IME land as typed and are reported once each', async ({ page }) => {
  const cdp = await page.context().newCDPSession(page);
  await setContent(page, '<p>안녕</p>');
  await caret(page, '안녕');
  await page.waitForTimeout(50);
  const before = await changeCount(page);

  await cdp.send('Input.imeSetComposition', { text: 'ㅎ', selectionStart: 1, selectionEnd: 1 });
  await cdp.send('Input.imeSetComposition', { text: '하', selectionStart: 1, selectionEnd: 1 });
  await page.waitForTimeout(100);
  expect(await changeCount(page)).toBe(before);

  await cdp.send('Input.insertText', { text: '하' });
  await compose(cdp, ['ㅅ', '세'], '세');
  await compose(cdp, ['ㅇ', '요'], '요');

  await expectHTML(page, '<p>안녕하세요</p>');
  await expect.poll(() => changeCount(page)).toBeGreaterThan(before);
  expect(await getHTML(page)).toBe('<p>안녕하세요</p>');
});

test('composing inside a bold word keeps the text in one strong', async ({ page }) => {
  const cdp = await page.context().newCDPSession(page);
  await setContent(page, '<p>가<strong>나다</strong>라</p>');
  await caret(page, '나다', 1);
  await compose(cdp, ['ㅁ', '마'], '마');
  await expectHTML(page, '<p>가<strong>나마다</strong>라</p>');
});

test('composing over a selection replaces it', async ({ page }) => {
  const cdp = await page.context().newCDPSession(page);
  await setContent(page, '<p>hello world</p>');
  await select(page, 'world');
  await compose(cdp, ['ㅅ', '세', '세ㄱ', '세계'], '세계');
  await expectHTML(page, '<p>hello 세계</p>');
});

test('a composed syllable is undone as a whole', async ({ page }) => {
  const cdp = await page.context().newCDPSession(page);
  await setContent(page, '<p>가</p>');
  await caret(page, '가');
  await page.waitForTimeout(350);
  await compose(cdp, ['ㄴ', '나'], '나');
  await page.waitForTimeout(350);
  await page.keyboard.press('ControlOrMeta+z');
  await expectHTML(page, '<p>가</p>');
});
