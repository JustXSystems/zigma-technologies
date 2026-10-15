import type { Editor } from '@tiptap/core';
import { TextSelection } from '@tiptap/pm/state';

export type BlockActions = {
  /** Opens the media library panel */
  pickImage: () => void;
  /** Opens the file chooser */
  uploadImage: () => void;
  /** Asks for a URL; null = cancelled */
  ask: (message: string, initial?: string) => string | null;
};

export type BlockItem = {
  id: string;
  label: string;
  hint: string;
  icon: string;
  group: 'Text' | 'Lists' | 'Highlights' | 'Media' | 'Layout';
  keywords: string;
  run: (editor: Editor, actions: BlockActions) => void;
};

/** Puts the cursor in the last `type` node before the selection (just-inserted blocks). */
function focusLast(editor: Editor, type: string) {
  editor.commands.command(({ tr, state }) => {
    let target = -1;
    state.doc.descendants((node, pos) => {
      if (pos >= state.selection.from) return false;
      if (node.type.name === type) target = pos;
      return true;
    });
    if (target >= 0) tr.setSelection(TextSelection.create(tr.doc, target + 1));
    return true;
  });
}

const callout = (tone: string, label: string, hint: string, icon: string): BlockItem => ({
  id: `callout-${tone}`,
  label,
  hint,
  icon,
  group: 'Highlights',
  keywords: `callout box ${tone} ${label}`,
  run: (editor) => {
    if (editor.isActive('callout')) editor.chain().focus().updateAttributes('callout', { tone }).run();
    else editor.chain().focus().wrapIn('callout', { tone }).run();
  },
});

export const BLOCKS: ReadonlyArray<BlockItem> = [
  { id: 'p', label: 'Text', hint: 'Plain paragraph', icon: '¶', group: 'Text', keywords: 'paragraph text body', run: (e) => e.chain().focus().setParagraph().run() },
  { id: 'h2', label: 'Section heading', hint: 'H2 — listed in the contents', icon: 'H2', group: 'Text', keywords: 'heading h2 title section', run: (e) => e.chain().focus().setHeading({ level: 2 }).run() },
  { id: 'h3', label: 'Sub-heading', hint: 'H3 — listed in the contents', icon: 'H3', group: 'Text', keywords: 'heading h3 subheading', run: (e) => e.chain().focus().setHeading({ level: 3 }).run() },
  { id: 'h4', label: 'Small heading', hint: 'H4', icon: 'H4', group: 'Text', keywords: 'heading h4', run: (e) => e.chain().focus().setHeading({ level: 4 }).run() },
  { id: 'quote', label: 'Pull quote', hint: 'A line worth remembering', icon: '❝', group: 'Text', keywords: 'quote blockquote citation', run: (e) => e.chain().focus().toggleBlockquote().run() },
  { id: 'code', label: 'Code / config', hint: 'Monospaced block', icon: '</>', group: 'Text', keywords: 'code pre snippet config', run: (e) => e.chain().focus().toggleCodeBlock().run() },
  { id: 'ul', label: 'Bulleted list', hint: 'Unordered points', icon: '•', group: 'Lists', keywords: 'bullet list ul unordered', run: (e) => e.chain().focus().toggleBulletList().run() },
  { id: 'ol', label: 'Numbered list', hint: '1, 2, 3', icon: '1.', group: 'Lists', keywords: 'numbered ordered list ol', run: (e) => e.chain().focus().toggleOrderedList().run() },
  {
    id: 'steps',
    label: 'Steps',
    hint: 'Numbered timeline for how-tos',
    icon: '①',
    group: 'Lists',
    keywords: 'steps how to process timeline procedure',
    run: (e) => {
      if (!e.isActive('orderedList')) e.chain().focus().toggleOrderedList().run();
      e.chain().focus().updateAttributes('orderedList', { variant: 'steps' }).run();
    },
  },
  callout('note', 'Note', 'Blue box for context', 'i'),
  callout('tip', 'Tip', 'Purple box for pro tips', '★'),
  callout('warning', 'Warning', 'Amber box for safety and pitfalls', '!'),
  callout('success', 'Verdict / result', 'Green box for outcomes', '✓'),
  {
    id: 'faq',
    label: 'FAQ',
    hint: 'Question that opens to an answer — also shown in Google',
    icon: '?',
    group: 'Highlights',
    keywords: 'faq question answer accordion details',
    run: (e) => {
      e.chain()
        .focus()
        .insertContent({ type: 'faqItem', content: [{ type: 'faqQuestion' }, { type: 'faqAnswer', content: [{ type: 'paragraph' }] }] })
        .run();
      focusLast(e, 'faqQuestion');
    },
  },
  { id: 'image', label: 'Image from library', hint: 'Pick from Media', icon: '▣', group: 'Media', keywords: 'image photo picture media library', run: (_e, a) => a.pickImage() },
  { id: 'upload', label: 'Upload image', hint: 'Or paste / drop one anywhere', icon: '⇪', group: 'Media', keywords: 'upload image photo file', run: (_e, a) => a.uploadImage() },
  {
    id: 'video',
    label: 'YouTube video',
    hint: 'Or paste a YouTube link',
    icon: '▶',
    group: 'Media',
    keywords: 'video youtube embed',
    run: (e, a) => {
      const src = a.ask('YouTube link (watch, share or shorts URL)');
      if (src) e.chain().focus().setYoutubeVideo({ src: src.trim() }).run();
    },
  },
  {
    id: 'table',
    label: 'Table',
    hint: 'Specs and comparisons',
    icon: '▦',
    group: 'Layout',
    keywords: 'table grid comparison specs',
    run: (e) => e.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
  },
  {
    id: 'button',
    label: 'Button',
    hint: 'Call to action link',
    icon: '⬭',
    group: 'Layout',
    keywords: 'button cta call to action link',
    run: (e) => e.chain().focus().insertContent({ type: 'buttonBlock' }).run(),
  },
  { id: 'hr', label: 'Divider', hint: 'Thin line between parts', icon: '—', group: 'Layout', keywords: 'divider rule hr line separator', run: (e) => e.chain().focus().setHorizontalRule().run() },
];

export function filterBlocks(query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return [...BLOCKS];
  return BLOCKS.filter((b) => b.label.toLowerCase().includes(q) || b.keywords.includes(q));
}
