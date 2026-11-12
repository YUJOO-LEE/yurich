import { test, expect, type Page } from '@playwright/test';
import { openHarness, setContent, getHTML, getJSON } from './helpers';

test.beforeEach(({ page }) => openHarness(page));

const toHTML = (page: Page, source: string, only?: string[]) =>
  page.evaluate(([value, names]) => {
    const div = document.createElement('div');
    div.innerHTML = value as string;
    const { extensions, toHTML: convert } = window.harness;
    return convert(div, names ? extensions.filter(ext => (names as string[]).includes(ext.name)) : extensions);
  }, [source, only] as const);

const toJSON = (page: Page, source: string) =>
  page.evaluate(value => {
    const div = document.createElement('div');
    div.innerHTML = value;
    return window.harness.toJSON(div, window.harness.extensions);
  }, source);

test('code-carrying tags are removed with their content', async ({ page }) => {
  expect(await toHTML(page,
    '<p>hi</p><style>p{}</style><script>alert(1)</script><iframe><b>x</b></iframe><title>T</title><svg><a>t</a></svg>',
  )).toBe('<p>hi</p>');
});

test('a form that shadows DOM properties does not break sanitizing', async ({ page }) => {
  expect(await toHTML(page, '<p>a</p><form><input name="tagName"><input name="childNodes">in <b>b</b></form>'))
    .toBe('<p>a</p>in <strong>b</strong>');
});

test('links keep only safe addresses', async ({ page }) => {
  expect(await toHTML(page,
    '<p><a href="javascript:alert(1)" onclick="x()">x</a><a href="HTTPS://ok.com" target="_blank">y</a><a href="/rel" target="_top">z</a></p>',
  )).toBe('<p><a>x</a><a href="HTTPS://ok.com" target="_blank" rel="noopener noreferrer">y</a><a>z</a></p>');
});

test('only text alignment survives from style, and no other attribute', async ({ page }) => {
  expect(await toHTML(page, '<p style="text-align:center;color:red" onclick="x()" class="c" id="i">p</p>'))
    .toBe('<p style="text-align: center">p</p>');
});

test('unknown block tags keep their line, unknown inline tags keep their text', async ({ page }) => {
  expect(await toHTML(page, '<article>text only</article><section><h1>T</h1></section><p>a<span>b</span></p>'))
    .toBe('<p>text only</p><h1>T</h1><p>ab</p>');
});

test('tags of extensions that are not enabled are not kept', async ({ page }) => {
  expect(await toHTML(page, '<p><em>x</em><strong>y</strong><mark>z</mark></p><h1>T</h1>', ['bold']))
    .toBe('<p>x<strong>y</strong>z</p><p>T</p>');
});

test('a custom mark is kept without attributes', async ({ page }) => {
  expect(await toHTML(page, '<p><mark class="c" onclick="x()">m</mark></p>')).toBe('<p><mark>m</mark></p>');
});

test('JSON carries marks, attributes and custom mark types', async ({ page }) => {
  const json = await toJSON(page,
    '<h2 style="text-align: right">T</h2>'
    + '<p>a<span>b</span><strong>c<br><em>d</em></strong><mark>m</mark>'
    + '<a href="https://ok.kr">l</a><a href="javascript:x">j</a></p>'
    + '<ul><li>i</li></ul>',
  );
  expect(json).toEqual({
    type: 'doc',
    content: [
      { type: 'heading', attrs: { level: 2, textAlign: 'right' }, content: [{ type: 'text', text: 'T' }] },
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'a' },
          { type: 'text', text: 'b' },
          { type: 'text', text: 'c', marks: [{ type: 'bold' }] },
          { type: 'text', text: '\n', marks: [{ type: 'bold' }] },
          { type: 'text', text: 'd', marks: [{ type: 'bold' }, { type: 'italic' }] },
          { type: 'text', text: 'm', marks: [{ type: 'highlight' }] },
          { type: 'text', text: 'l', marks: [{ type: 'link', attrs: { href: 'https://ok.kr' } }] },
          { type: 'text', text: 'j', marks: [{ type: 'link' }] },
        ],
      },
      { type: 'unorderedList', content: [{ type: 'listItem', content: [{ type: 'text', text: 'i' }] }] },
    ],
  });
});

test('the editor output equals converting its element directly', async ({ page }) => {
  await setContent(page,
    '<h1 style="text-align:center">T</h1><p>a<strong>b</strong><mark>m</mark></p>'
    + '<p>a<strong>b</strong><mark>m</mark></p><ul><li>x</li></ul><pre>\n code\n</pre><blockquote>q</blockquote>',
  );
  const direct = await page.evaluate(() => {
    const { editors, extensions, toHTML: html, toJSON: json } = window.harness;
    return { html: html(editors.a.el!, extensions), json: json(editors.a.el!, extensions) };
  });
  expect(await getHTML(page)).toBe(direct.html);
  expect(await getJSON(page)).toEqual(direct.json);

  await page.evaluate(() => {
    document.querySelector('.editor-a blockquote')!.textContent = 'changed';
  });
  await page.waitForTimeout(50);
  expect(await getHTML(page)).toContain('<blockquote>changed</blockquote>');
});
