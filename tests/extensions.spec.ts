import { test, expect } from '@playwright/test';
import { openHarness, setContent, select, caret, execute, expectHTML, getHTML, getJSON, paste } from './helpers';

test.beforeEach(({ page }) => openHarness(page));

test('a block made with block() toggles and is kept in the output', async ({ page }) => {
  await setContent(page, '<p>note</p>');
  await caret(page, 'note');
  await execute(page, 'toggleCallout');
  await expectHTML(page, '<aside>note</aside>');
  expect(await getHTML(page)).toBe('<aside>note</aside>');
  expect((await getJSON(page)).content[0].type).toBe('callout');
  await execute(page, 'toggleCallout');
  await expectHTML(page, '<p>note</p>');
});

test('a mark keeps only the attributes its rules accept', async ({ page }) => {
  await setContent(page, '<p>hello world</p>');
  await select(page, 'world');
  await execute(page, 'setMention', 7);
  await expectHTML(page, '<p>hello <cite data-id="7">world</cite></p>');
  expect(await getHTML(page)).toBe('<p>hello <cite data-id="7">world</cite></p>');
  expect((await getJSON(page)).content[0].content?.[1].marks).toEqual([
    { type: 'mention', attrs: { 'data-id': '7' } },
  ]);

  await caret(page, 'hello ', 0);
  await paste(page, { html: '<cite data-id="x" onclick="steal()" class="c">bad</cite>' });
  expect(await getHTML(page)).toBe('<p><cite>bad</cite>hello <cite data-id="7">world</cite></p>');
});
