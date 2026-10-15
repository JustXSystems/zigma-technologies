import { Extension, Node, type Editor } from '@tiptap/core';
import Heading from '@tiptap/extension-heading';
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table';
import Typography from '@tiptap/extension-typography';
import Youtube from '@tiptap/extension-youtube';
import { Placeholder } from '@tiptap/extensions';
import { TextSelection } from '@tiptap/pm/state';
import { ReactNodeViewRenderer } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { ButtonView, FigureView } from './node-views';

export const CALLOUT_TONES = [
  { value: 'note', label: 'Note', icon: 'i' },
  { value: 'tip', label: 'Tip', icon: '★' },
  { value: 'warning', label: 'Warning', icon: '!' },
  { value: 'success', label: 'Success', icon: '✓' },
] as const;

/**
 * Enter on an empty last paragraph inside `type` steps out of it (like leaving a list).
 * `exitDepthOffset` 1 leaves the parent as well (an FAQ answer leaves the whole FAQ item).
 */
function exitOnEmptyEnter(editor: Editor, type: string, exitDepthOffset = 0) {
  const { state, view } = editor;
  const { $from, empty } = state.selection;
  if (!empty || $from.parent.type.name !== 'paragraph' || $from.parent.content.size) return false;
  for (let d = $from.depth - 1; d > 0; d--) {
    const container = $from.node(d);
    if (container.type.name !== type) continue;
    if (container.childCount < 2 || $from.index(d) !== container.childCount - 1) return false;
    const exitDepth = d - exitDepthOffset;
    const tr = state.tr.delete($from.before(), $from.after());
    const at = tr.mapping.map($from.after(exitDepth));
    tr.insert(at, state.schema.nodes.paragraph.create());
    tr.setSelection(TextSelection.create(tr.doc, at + 1));
    view.dispatch(tr.scrollIntoView());
    return true;
  }
  return false;
}

/** `<div class="blg-callout" data-tone>` — boxed note, tip, warning or success. */
export const Callout = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',
  defining: true,
  addAttributes() {
    return {
      tone: {
        default: 'note',
        parseHTML: (el) => el.getAttribute('data-tone') || 'note',
        renderHTML: (attrs) => ({ 'data-tone': attrs.tone }),
      },
    };
  },
  parseHTML() {
    return [{ tag: 'div.blg-callout' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', { ...HTMLAttributes, class: 'blg-callout' }, 0];
  },
  addKeyboardShortcuts() {
    return { Enter: () => exitOnEmptyEnter(this.editor, 'callout') };
  },
});

const figureImg = (el: HTMLElement) => (el.tagName === 'IMG' ? el : el.querySelector('img'));

/** `<figure data-size><img><figcaption>` — every body image, so each can be sized and captioned. */
export const Figure = Node.create({
  name: 'figure',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,
  addAttributes() {
    return {
      src: { default: '', parseHTML: (el) => figureImg(el)?.getAttribute('src') || '', rendered: false },
      alt: { default: '', parseHTML: (el) => figureImg(el)?.getAttribute('alt') || '', rendered: false },
      caption: { default: '', parseHTML: (el) => el.querySelector('figcaption')?.textContent?.trim() || '', rendered: false },
      size: { default: 'normal', parseHTML: (el) => el.getAttribute('data-size') || 'normal', rendered: false },
    };
  },
  parseHTML() {
    return [
      { tag: 'figure', getAttrs: (el) => (figureImg(el as HTMLElement) ? null : false) },
      { tag: 'img[src]', priority: 40 },
    ];
  },
  renderHTML({ node }) {
    const { src, alt, caption, size } = node.attrs as Record<string, string>;
    const img = ['img', { src, alt: alt || '' }] as const;
    return ['figure', size && size !== 'normal' ? { 'data-size': size } : {}, img, ...(caption ? [['figcaption', {}, caption] as const] : [])];
  },
  addNodeView() {
    return ReactNodeViewRenderer(FigureView);
  },
});

/** `<p class="blg-btn-block"><a class="blg-btn">` — a call-to-action button inside the article. */
export const ButtonBlock = Node.create({
  name: 'buttonBlock',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,
  addAttributes() {
    return {
      href: { default: '/contact', parseHTML: (el) => el.querySelector('a')?.getAttribute('href') || '', rendered: false },
      label: { default: 'Talk to an engineer →', parseHTML: (el) => el.querySelector('a')?.textContent?.trim() || '', rendered: false },
      variant: { default: 'primary', parseHTML: (el) => el.querySelector('a')?.getAttribute('data-style') || 'primary', rendered: false },
    };
  },
  parseHTML() {
    return [{ tag: 'p.blg-btn-block', priority: 100 }];
  },
  renderHTML({ node }) {
    const { href, label, variant } = node.attrs as Record<string, string>;
    return ['p', { class: 'blg-btn-block' }, ['a', { class: 'blg-btn', 'data-style': variant, href }, label]];
  },
  addNodeView() {
    return ReactNodeViewRenderer(ButtonView);
  },
});

/** Editing shows a plain box; the page renders a native, accessible `<details>` accordion. */
const plainView = (className: string) => () => () => {
  const dom = document.createElement('div');
  dom.className = className;
  return { dom, contentDOM: dom };
};

export const FaqItem = Node.create({
  name: 'faqItem',
  group: 'block',
  content: 'faqQuestion faqAnswer',
  defining: true,
  parseHTML() {
    return [{ tag: 'details' }];
  },
  renderHTML() {
    return ['details', { class: 'blg-faq' }, 0];
  },
  addNodeView: plainView('blg-faq abl-faq'),
});

export const FaqQuestion = Node.create({
  name: 'faqQuestion',
  content: 'inline*',
  defining: true,
  parseHTML() {
    return [{ tag: 'summary' }];
  },
  renderHTML() {
    return ['summary', 0];
  },
  addNodeView: plainView('abl-faq-q'),
  addKeyboardShortcuts() {
    return {
      Enter: () => {
        const { $from } = this.editor.state.selection;
        if ($from.parent.type.name !== 'faqQuestion') return false;
        return this.editor.commands.setTextSelection($from.after() + 2);
      },
    };
  },
});

export const FaqAnswer = Node.create({
  name: 'faqAnswer',
  content: 'block+',
  defining: true,
  parseHTML() {
    return [{ tag: 'div.blg-faq-a' }];
  },
  renderHTML() {
    return ['div', { class: 'blg-faq-a' }, 0];
  },
  addKeyboardShortcuts() {
    return { Enter: () => exitOnEmptyEnter(this.editor, 'faqAnswer', 1) };
  },
});

/** `<ol class="blg-steps">` — a numbered list drawn as a step-by-step timeline. */
export const StepsList = Extension.create({
  name: 'stepsList',
  addGlobalAttributes() {
    return [
      {
        types: ['orderedList'],
        attributes: {
          variant: {
            default: null,
            parseHTML: (el) => (el.classList.contains('blg-steps') ? 'steps' : null),
            renderHTML: (attrs) => (attrs.variant === 'steps' ? { class: 'blg-steps' } : {}),
          },
        },
      },
    ];
  },
});

/** Pasted H1s become section headings and H5/H6 become H4 — the page title is the only H1. */
const ArticleHeading = Heading.extend({
  parseHTML() {
    return [
      { tag: 'h1', attrs: { level: 2 } },
      { tag: 'h2', attrs: { level: 2 } },
      { tag: 'h3', attrs: { level: 3 } },
      { tag: 'h4', attrs: { level: 4 } },
      { tag: 'h5', attrs: { level: 4 } },
      { tag: 'h6', attrs: { level: 4 } },
    ];
  },
}).configure({ levels: [2, 3, 4] });

function placeholder({ editor, node, pos }: { editor: Editor; node: { type: { name: string }; attrs: Record<string, unknown> }; pos: number }) {
  if (node.type.name === 'heading') return `Heading ${node.attrs.level}`;
  if (node.type.name === 'faqQuestion') return 'Question…';
  const parent = editor.state.doc.resolve(pos).parent.type.name;
  if (parent === 'faqAnswer') return 'Answer…';
  if (parent === 'callout') return 'Callout text…';
  if (parent === 'listItem') return 'List item';
  if (editor.isEmpty) return 'Start writing — or paste from Google Docs, Word or Markdown. Type / for blocks.';
  return 'Type / for blocks';
}

export function articleExtensions() {
  return [
    StarterKit.configure({
      heading: false,
      link: { openOnClick: false, autolink: true, defaultProtocol: 'https', HTMLAttributes: { target: null, rel: null } },
    }),
    ArticleHeading,
    Typography,
    Placeholder.configure({ includeChildren: true, placeholder }),
    Table.configure({ resizable: false }),
    TableRow,
    TableHeader,
    TableCell,
    Youtube.configure({ nocookie: true, modestBranding: true, rel: 0 }),
    Callout,
    Figure,
    ButtonBlock,
    FaqItem,
    FaqQuestion,
    FaqAnswer,
    StepsList,
  ];
}
