import { expect, type Page } from '@playwright/test';

export const openHarness = async (page: Page): Promise<void> => {
  await page.goto('/tests/harness/');
  await page.waitForFunction(() => !!window.harness?.editors.a?.el);
};

const editorSelector = (id: string) => `.editor-${id}`;

export const setContent = async (page: Page, html: string, id = 'a'): Promise<void> => {
  await page.evaluate(([sel, value]) => {
    const el = document.querySelector<HTMLElement>(sel)!;
    el.focus();
    el.innerHTML = value;
  }, [editorSelector(id), html]);
  await settle(page);
};

export const settle = async (page: Page): Promise<void> => {
  await page.evaluate(() => new Promise<void>(resolve => {
    requestAnimationFrame(() => setTimeout(resolve, 0));
  }));
};

export const html = (page: Page, id = 'a'): Promise<string> =>
  page.evaluate(sel => document.querySelector(sel)!.innerHTML, editorSelector(id));

export const getHTML = (page: Page, id = 'a'): Promise<string> =>
  page.evaluate(key => window.harness.editors[key].getHTML(), id);

export const getJSON = (page: Page, id = 'a') =>
  page.evaluate(key => window.harness.editors[key].getJSON(), id);

type Point = { text: string; at: 'start' | 'end' | number; nth?: number };

const point = (value: string | Point, fallback: 'start' | 'end'): Point =>
  typeof value === 'string' ? { text: value, at: fallback } : value;

/** Selects from the start of `from` to the end of `to`, both located by their text. */
export const select = async (
  page: Page,
  from: string | Point,
  to: string | Point = from,
  id = 'a',
): Promise<void> => {
  await page.evaluate(([sel, start, end]) => {
    const root = document.querySelector<HTMLElement>(sel as string)!;
    const locate = (p: Point): [Node, number] => {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let seen = 0;
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const index = node.textContent!.indexOf(p.text);
        if (index === -1) continue;
        if (seen++ < (p.nth ?? 0)) continue;
        const offset = p.at === 'start' ? index : p.at === 'end' ? index + p.text.length : index + p.at;
        return [node, offset];
      }
      throw new Error(`text not found: ${p.text}`);
    };
    root.focus();
    const [startNode, startOffset] = locate(start as Point);
    const [endNode, endOffset] = locate(end as Point);
    window.getSelection()!.setBaseAndExtent(startNode, startOffset, endNode, endOffset);
  }, [editorSelector(id), point(from, 'start'), point(to, 'end')] as const);
  await settle(page);
};

export const caret = (page: Page, text: string, at: 'start' | 'end' | number = 'end', id = 'a') =>
  select(page, { text, at }, { text, at }, id);

export const execute = async (page: Page, command: string, value?: unknown, id = 'a'): Promise<void> => {
  await page.evaluate(([key, name, arg]) => {
    window.harness.editors[key as string].execute(name as string, arg);
  }, [id, command, value] as const);
  await settle(page);
};

export const paste = async (
  page: Page,
  data: { html?: string; text?: string },
  id = 'a',
): Promise<void> => {
  await page.evaluate(([sel, payload]) => {
    const { html: htmlData, text } = payload as { html?: string; text?: string };
    const transfer = new DataTransfer();
    if (htmlData !== undefined) transfer.setData('text/html', htmlData);
    if (text !== undefined) transfer.setData('text/plain', text);
    const event = new ClipboardEvent('paste', { bubbles: true, cancelable: true });
    // Firefox hides the data of a constructed clipboard event from page scripts
    Object.defineProperty(event, 'clipboardData', { value: transfer });
    document.querySelector(sel as string)!.dispatchEvent(event);
  }, [editorSelector(id), data] as const);
  await settle(page);
};

export const undoKey = (page: Page) => page.keyboard.press('ControlOrMeta+z');
export const redoKey = (page: Page) => page.keyboard.press('ControlOrMeta+Shift+z');

/** History groups changes made within 300ms of each other; wait it out to start a new entry. */
export const newHistoryEntry = (page: Page) => page.waitForTimeout(350);

export const expectHTML = async (page: Page, expected: string, id = 'a'): Promise<void> => {
  await expect.poll(() => html(page, id)).toBe(expected);
};
