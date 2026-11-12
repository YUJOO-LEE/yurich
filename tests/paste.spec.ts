import { test, expect } from '@playwright/test';
import { openHarness, setContent, caret, paste, expectHTML, html } from './helpers';

test.beforeEach(({ page }) => openHarness(page));

test('plain text keeps its line breaks', async ({ page }) => {
  await setContent(page, '<p>ab</p>');
  await caret(page, 'ab', 1);
  await paste(page, { text: 'x\r\ny' });
  await expectHTML(page, '<p>ax<br>yb</p>');
});

test('plain text inside a code block keeps raw newlines', async ({ page }) => {
  await setContent(page, '<pre>code</pre>');
  await caret(page, 'code');
  await paste(page, { text: '\nl1\nl2' });
  await expectHTML(page, '<pre>code\nl1\nl2</pre>');
});

test('inline HTML is inserted at the caret and typing continues after it', async ({ page }) => {
  await setContent(page, '<p>ab</p>');
  await caret(page, 'ab', 1);
  await paste(page, { html: '<b>bold</b>', text: 'bold' });
  await expectHTML(page, '<p>a<strong>bold</strong>b</p>');
  await page.keyboard.type('!');
  await expectHTML(page, '<p>a<strong>bold!</strong>b</p>');
});

test('blocks split the paragraph at the caret', async ({ page }) => {
  await setContent(page, '<p>abcd</p>');
  await caret(page, 'abcd', 2);
  await paste(page, { html: '<h2>T</h2><p>x</p>' });
  await expectHTML(page, '<p>ab</p><h2>T</h2><p>x</p><p>cd</p>');
});

test('a single copied paragraph joins the current line', async ({ page }) => {
  await setContent(page, '<p>abcd</p>');
  await caret(page, 'abcd', 2);
  await paste(page, { html: '<p>one <strong>line</strong></p>' });
  await expectHTML(page, '<p>abone <strong>line</strong>cd</p>');
});

test('list items pasted into a list stay in one list', async ({ page }) => {
  await setContent(page, '<ol><li>one</li><li>twothree</li><li>four</li></ol>');
  await caret(page, 'twothree', 3);
  await paste(page, { html: '<ol><li>A</li><li>B</li></ol>' });
  await expectHTML(
    page,
    '<ol><li>one</li><li>two</li><li>A</li><li>B</li><li>three</li><li>four</li></ol>',
  );
});

test('pasting bold onto an empty bold line leaves no nested tag or stray break', async ({ page }) => {
  await setContent(page, '<p>x</p><p><strong><br></strong></p>');
  await page.evaluate(() => {
    window.getSelection()!.collapse(document.querySelector('.editor-a strong'), 0);
  });
  await paste(page, { html: '<strong>bold</strong>' });
  await expectHTML(page, '<p>x</p><p><strong>bold</strong></p>');
});

test('tags outside the schema are unwrapped and table cells become paragraphs', async ({ page }) => {
  await setContent(page, '<p>ab</p>');
  await caret(page, 'ab', 1);
  await paste(page, { html: '<span style="color:red">red</span>' });
  await expectHTML(page, '<p>aredb</p>');

  await setContent(page, '<p><br></p>');
  await page.evaluate(() => {
    window.getSelection()!.collapse(document.querySelector('.editor-a p'), 0);
  });
  await paste(page, { html: '<table><tbody><tr><td>a</td><td>b</td></tr></tbody></table>' });
  await expectHTML(page, '<p>a</p><p>b</p>');
});

test('an editor keeps only what its own extensions allow', async ({ page }) => {
  await caret(page, 'second editor', 'end', 'b');
  await paste(page, { html: '<h1>T</h1><p><em>x</em><strong>y</strong></p>' }, 'b');
  await expectHTML(page, '<p>second editor</p><p>T</p><p>x<strong>y</strong></p>', 'b');
});

test('hostile HTML neither runs nor leaves handlers behind', async ({ page }) => {
  await setContent(page, '<p>x</p>');
  await caret(page, 'x');
  await paste(page, {
    html: '<img src=x onerror="window.__xss=1"><svg onload="window.__xss=2"><script>window.__xss=3</script></svg>'
      + '<iframe srcdoc="<script>parent.__xss=4</script>"></iframe>'
      + '<a href="javascript:window.__xss=5" onmouseover="window.__xss=6">link</a>'
      + '<p style="background:url(x)" onfocus="window.__xss=7" autofocus>p</p>'
      + '<form><input name="tagName" autofocus onfocus="window.__xss=8"></form>'
      + '<details open ontoggle="window.__xss=9">d</details><style>@import "x";</style>'
      + '<math><a xlink:href="javascript:window.__xss=10">m</a></math>',
  });
  await page.waitForTimeout(300);
  const result = await page.evaluate(() => {
    const root = document.querySelector('.editor-a')!;
    const offending = [...root.querySelectorAll('*')].filter(el =>
      !['P', 'A', 'BR'].includes(el.tagName) || [...el.attributes].some(attr => attr.name !== 'href'));
    return { xss: (window as unknown as { __xss?: number }).__xss, offending: offending.length };
  });
  expect(result).toEqual({ xss: undefined, offending: 0 });
  expect(await html(page)).not.toContain('javascript:');
});

test('paste reports one change', async ({ page }) => {
  await setContent(page, '<p>ab</p>');
  await caret(page, 'ab', 1);
  await page.waitForTimeout(50);
  const before = await page.evaluate(() => window.harness.changes.a.length);
  await paste(page, { text: 'x' });
  await expect.poll(() => page.evaluate(() => window.harness.changes.a.length)).toBe(before + 1);
  expect(await page.evaluate(() => window.harness.changes.a.at(-1))).toBe('<p>axb</p>');
});
