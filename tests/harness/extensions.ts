import { mark, block } from '../../src';
import type { Extension } from '../../src';

export const Highlight = mark({ name: 'highlight', tag: 'mark' });

export const Callout = block({ name: 'callout', tag: 'aside' });

export const Mention: Extension = {
  name: 'mention',
  marks: [{
    tag: 'cite',
    type: 'mention',
    attrs: { 'data-id': value => (value && /^\d+$/.test(value) ? value : null) },
  }],
  commands: {
    setMention: (editor, value) => editor.setMark('cite', { 'data-id': String(value) }),
    removeMention: editor => editor.removeMark('cite'),
  },
  isActive: editor => editor.isMarkActive('cite'),
};
