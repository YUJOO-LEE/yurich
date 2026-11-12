import type { SelectionPath } from './selection';

export type HistoryEntry = {
  /** Raw HTML of each top-level block. Unchanged blocks share their string with the previous entry. */
  blocks: string[];
  before: SelectionPath | null;
  after: SelectionPath | null;
};

export type HistoryTarget = { blocks: string[]; selection: SelectionPath | null };

const GROUP_INTERVAL = 300;

export const createHistory = (limit: number) => {
  let undoStack: HistoryEntry[] = [];
  let redoStack: HistoryEntry[] = [];
  let current: HistoryEntry = { blocks: [], before: null, after: null };
  let pending: HistoryEntry | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const commit = (): void => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    if (!pending) return;

    undoStack.push(current);
    if (undoStack.length > limit) undoStack.shift();
    current = pending;
    pending = null;
    redoStack = [];
  };

  return {
    reset(blocks: string[]): void {
      undoStack = [];
      redoStack = [];
      pending = null;
      current = { blocks, before: null, after: null };
    },

    record(entry: HistoryEntry, isTyping: boolean): void {
      // Only typing is grouped into one undo step; a command or a paste is a step of its own
      if (!isTyping) {
        commit();
        pending = entry;
        commit();
        return;
      }
      pending = pending ? { ...entry, before: pending.before } : entry;
      if (timer !== null) clearTimeout(timer);
      timer = setTimeout(commit, GROUP_INTERVAL);
    },

    undo(): HistoryTarget | null {
      commit();
      const previous = undoStack.pop();
      if (!previous) return null;
      const undone = current;
      redoStack.push(undone);
      current = previous;
      return { blocks: previous.blocks, selection: undone.before };
    },

    redo(): HistoryTarget | null {
      commit();
      const next = redoStack.pop();
      if (!next) return null;
      undoStack.push(current);
      current = next;
      return { blocks: next.blocks, selection: next.after };
    },

    canUndo: (): boolean => undoStack.length > 0 || pending !== null,
    canRedo: (): boolean => redoStack.length > 0 && pending === null,

    cancelTimer(): void {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
    },
  };
};
