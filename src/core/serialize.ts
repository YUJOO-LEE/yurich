import type { DocumentJSON, Extension, MarkJSON, NodeJSON } from './types';
import type { Schema } from './schema';
import { createSchema } from './schema';
import { readFormChildren, sanitizeNodes, sanitizeStyle } from './sanitize';

const camelCase = (property: string): string =>
  property.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());

const parseNode = (node: Node, marks: MarkJSON[], schema: Schema, isRoot = false): NodeJSON[] => {
  const text = (value: string): NodeJSON[] => {
    const textNode: NodeJSON = { type: 'text', text: value };
    if (marks.length > 0) textNode.marks = [...marks];
    return [textNode];
  };
  const children = (nodes: Iterable<Node>, childMarks: MarkJSON[]): NodeJSON[] =>
    Array.from(nodes).flatMap(child => parseNode(child, childMarks, schema));

  if (node instanceof HTMLFormElement) return children(readFormChildren(node), marks);
  if (node.nodeType === Node.TEXT_NODE) {
    const value = node.textContent ?? '';
    return (isRoot ? value.trim() : value) ? text(value) : [];
  }
  if (!(node instanceof Element)) return [];

  const tag = node.localName;
  if (tag === 'br') return isRoot ? [] : text('\n');

  const markSpec = schema.marks.get(tag);
  if (markSpec) {
    const mark: MarkJSON = { type: markSpec.type };
    const attrs: Record<string, unknown> = {};
    for (const [name, rule] of Object.entries(markSpec.attrs ?? {})) {
      const value = rule(node.getAttribute(name), node);
      if (value !== null) attrs[name] = value;
    }
    if (Object.keys(attrs).length > 0) mark.attrs = attrs;
    return children(node.childNodes, [...marks, mark]);
  }

  const blockSpec = schema.blocks.get(tag);
  if (!blockSpec) {
    // e.g. <span>: carries no meaning of its own, but its content does
    return children(node.childNodes, marks);
  }

  const nodeJSON: NodeJSON = { type: blockSpec.type };
  const attrs: Record<string, unknown> = { ...blockSpec.attrs };
  for (const declaration of sanitizeStyle(node.getAttribute('style'), schema).split('; ')) {
    const [property, value] = declaration.split(': ');
    if (value) attrs[camelCase(property)] = value;
  }
  if (Object.keys(attrs).length > 0) nodeJSON.attrs = attrs;

  const content = children(node.childNodes, marks);
  if (content.length > 0) nodeJSON.content = content;
  return [nodeJSON];
};

export const nodeToJSON = (node: Node, schema: Schema): NodeJSON[] => parseNode(node, [], schema, true);

export const toHTML = (el: HTMLElement, extensions: Extension[]): string =>
  sanitizeNodes(el.childNodes, createSchema(extensions));

export const toJSON = (el: HTMLElement, extensions: Extension[]): DocumentJSON => {
  const schema = createSchema(extensions);
  return { type: 'doc', content: Array.from(el.childNodes).flatMap(node => nodeToJSON(node, schema)) };
};
