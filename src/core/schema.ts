import type { BlockSpec, Extension, MarkSpec } from './types';

export type Schema = {
  /** Keyed by tag and by alias */
  marks: ReadonlyMap<string, MarkSpec>;
  blocks: ReadonlyMap<string, BlockSpec>;
  blockStyles: ReadonlyMap<string, ReadonlySet<string>>;
  blockSelector: string;
};

// The browser starts lines as <div> in some cases; both are the paragraph every editor has
const PARAGRAPH: BlockSpec = { tag: 'p', type: 'paragraph', aliases: ['div'] };

export const createSchema = (extensions: Extension[]): Schema => {
  const marks = new Map<string, MarkSpec>();
  const blocks = new Map<string, BlockSpec>();
  const blockStyles = new Map<string, ReadonlySet<string>>();

  const add = <T extends MarkSpec | BlockSpec>(map: Map<string, T>, spec: T): void => {
    for (const tag of [spec.tag, ...(spec.aliases ?? [])]) map.set(tag, spec);
  };

  add(blocks, PARAGRAPH);
  for (const ext of extensions) {
    ext.marks?.forEach(spec => add(marks, spec));
    ext.blocks?.forEach(spec => add(blocks, spec));
    for (const [property, values] of Object.entries(ext.blockStyles ?? {})) {
      blockStyles.set(property, new Set(values));
    }
  }

  return { marks, blocks, blockStyles, blockSelector: Array.from(blocks.keys()).join(',') };
};

export const isBlock = (node: Node, schema: Schema): node is HTMLElement =>
  node instanceof HTMLElement && schema.blocks.has(node.localName);
