import type { HistoryManager } from './types';

export type HistoryContext = {
  getEl: () => HTMLDivElement | null;
  afterApply: () => void;
  sanitize?: (html: string) => string;
};

class HistoryManagerImpl implements HistoryManager {
  private undoStack: string[] = [];
  private redoStack: string[] = [];
  private current: string | null = null;
  private limit: number;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingHtml: string | null = null;
  private ctx: HistoryContext;

  constructor(limit: number, ctx: HistoryContext) {
    this.limit = limit;
    this.ctx = ctx;
  }

  init(html: string): void {
    this.current = html;
  }

  private commitPending(): void {
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    if (this.pendingHtml === null) return;

    const html = this.pendingHtml;
    this.pendingHtml = null;

    if (this.current === html) return;

    if (this.current !== null) {
      this.undoStack.push(this.current);
      if (this.undoStack.length > this.limit) {
        this.undoStack.shift();
      }
    }

    this.current = html;
    this.redoStack.length = 0;
  }

  push(html: string): void {
    this.pendingHtml = html;

    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      this.commitPending();
    }, 300);
  }

  undo(): void {
    this.commitPending();

    if (this.undoStack.length === 0) return;

    if (this.current !== null) {
      this.redoStack.push(this.current);
    }

    this.current = this.undoStack.pop()!;

    const el = this.ctx.getEl();
    if (el) {
      el.innerHTML = this.ctx.sanitize ? this.ctx.sanitize(this.current) : this.current;
    }

    this.ctx.afterApply();
  }

  redo(): void {
    this.commitPending();

    if (this.redoStack.length === 0) return;

    if (this.current !== null) {
      this.undoStack.push(this.current);
    }

    this.current = this.redoStack.pop()!;

    const el = this.ctx.getEl();
    if (el) {
      el.innerHTML = this.ctx.sanitize ? this.ctx.sanitize(this.current) : this.current;
    }

    this.ctx.afterApply();
  }

  canUndo(): boolean {
    return this.undoStack.length > 0 || this.pendingHtml !== null;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  destroy(): void {
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }
}

export const createHistoryManager = (limit: number = 100, ctx: HistoryContext): HistoryManager => {
  return new HistoryManagerImpl(limit, ctx);
};
