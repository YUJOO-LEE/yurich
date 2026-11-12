import { mark } from './factories';

export const Bold = mark({ name: 'bold', tag: 'strong', aliases: ['b'], shortcut: 'Mod+B' });
export const Italic = mark({ name: 'italic', tag: 'em', aliases: ['i'], shortcut: 'Mod+I' });
export const Underline = mark({ name: 'underline', tag: 'u', shortcut: 'Mod+U' });
export const Strikethrough = mark({ name: 'strikethrough', tag: 's', aliases: ['del'], shortcut: 'Mod+Shift+S' });
export const Code = mark({ name: 'code', tag: 'code' });
