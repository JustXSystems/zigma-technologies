'use client';

import type { Editor } from '@tiptap/core';
import { isValidYoutubeUrl } from '@tiptap/extension-youtube';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import MediaPicker from '@/components/admin/MediaPicker';
import { looksLikeMarkdown, markdownToHtml } from '@/lib/blog-writing';
import { BLOCKS, filterBlocks, type BlockActions, type BlockItem } from './editor/blocks';
import { CALLOUT_TONES, articleExtensions } from './editor/extensions';
import { altFromFileName, imageFiles, uploadImage } from './editor/upload';

type Props = {
  value: string;
  onChange: (html: string) => void;
  /** Article style classes and variables, so the canvas reads like the published page */
  canvasClass: string;
  canvasStyle?: CSSProperties;
  focus: boolean;
  onFocusChange: (on: boolean) => void;
};

type Slash = { from: number; query: string; left: number; top: number };

const serialize = (editor: Editor) => (editor.isEmpty ? '' : editor.getHTML());

const prettyHtml = (html: string) =>
  html.replace(/>\s*(<\/?(?:p|h[1-6]|ul|ol|li|blockquote|figure|table|tbody|thead|tr|details|summary|div|pre|hr)\b)/g, '>\n$1').trim();

/** `/query` typed at the cursor inside a paragraph, or null. */
function findSlash(editor: Editor): Omit<Slash, 'left' | 'top'> | null {
  const { selection } = editor.state;
  const { $from } = selection;
  if (!selection.empty || $from.parent.type.name !== 'paragraph') return null;
  const before = $from.parent.textBetween(0, $from.parentOffset, undefined, '\ufffc');
  const m = before.match(/(?:^|\s)\/([a-z0-9-]{0,24})$/i);
  return m ? { from: $from.pos - m[1].length - 1, query: m[1] } : null;
}

function unwrap(editor: Editor, type: string) {
  editor
    .chain()
    .focus()
    .command(({ tr, state }) => {
      const { $from } = state.selection;
      for (let d = $from.depth; d > 0; d--) {
        const node = $from.node(d);
        if (node.type.name === type) {
          tr.replaceWith($from.before(d), $from.after(d), node.content);
          return true;
        }
      }
      return false;
    })
    .run();
}

function Tool({ on, title, onRun, disabled, children, wide }: { on?: boolean; title: string; onRun: () => void; disabled?: boolean; children: ReactNode; wide?: boolean }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={on}
      disabled={disabled}
      className={`${on ? 'is-on' : ''}${wide ? ' is-wide' : ''}`}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onRun}
    >
      {children}
    </button>
  );
}

function BlockList({ items, active, onPick, onHover }: { items: BlockItem[]; active?: number; onPick: (b: BlockItem) => void; onHover?: (i: number) => void }) {
  return (
    <div className="abl-blocks" role="listbox" aria-label="Blocks">
      {items.map((b, i) => {
        const head = i === 0 || items[i - 1].group !== b.group ? b.group : '';
        return (
          <div key={b.id}>
            {head ? <p className="abl-blocks-group">{head}</p> : null}
            <button
              type="button"
              role="option"
              aria-selected={active === i}
              className={active === i ? 'is-active' : ''}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => onHover?.(i)}
              onClick={() => onPick(b)}
            >
              <span className="abl-blocks-icon" aria-hidden>
                {b.icon}
              </span>
              <span className="abl-blocks-text">
                <strong>{b.label}</strong>
                <small>{b.hint}</small>
              </span>
            </button>
          </div>
        );
      })}
    </div>
  );
}

/** Visual article editor: writes the same HTML the public page renders, styled like the chosen article design. */
export default function BlogRichEditor({ value, onChange, canvasClass, canvasStyle, focus, onFocusChange }: Props) {
  const onChangeRef = useRef(onChange);
  const lastEmitted = useRef(value);
  const pasteRef = useRef<(e: ClipboardEvent) => boolean>(() => false);
  const dropRef = useRef<(e: DragEvent, moved: boolean) => boolean>(() => false);
  const keyRef = useRef<(e: KeyboardEvent) => boolean>(() => false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<'visual' | 'html'>('visual');
  const [source, setSource] = useState('');
  const [insertOpen, setInsertOpen] = useState(false);
  const [imagePanel, setImagePanel] = useState<{ src: string; alt: string; caption: string } | null>(null);
  const [uploading, setUploading] = useState(0);
  const [notice, setNotice] = useState('');
  const [linkDraft, setLinkDraft] = useState<string | null>(null);
  const [slash, setSlash] = useState<Slash | null>(null);
  const [slashIndex, setSlashIndex] = useState(0);
  const slashDismissed = useRef<number | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
    extensions: articleExtensions(),
    content: value || '',
    editorProps: {
      attributes: { class: 'blg-prose abl-rich-doc', spellcheck: 'true', 'aria-label': 'Article body' },
      handlePaste: (_view, event) => pasteRef.current(event),
      handleDrop: (_view, event, _slice, moved) => dropRef.current(event, moved),
      handleKeyDown: (_view, event) => keyRef.current(event),
    },
    onUpdate: ({ editor: e }) => {
      const html = serialize(e);
      lastEmitted.current = html;
      onChangeRef.current(html);
    },
  });

  const snap = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      if (!e) return null;
      const { doc } = e.state;
      const headings: Array<{ level: number; text: string; pos: number }> = [];
      doc.forEach((node, pos) => {
        if (node.type.name === 'heading' && node.textContent.trim()) headings.push({ level: Number(node.attrs.level), text: node.textContent, pos });
      });
      const text = doc.textBetween(0, doc.content.size, ' ', ' ').trim();
      const steps = e.isActive('orderedList', { variant: 'steps' });
      return {
        block: e.isActive('heading', { level: 2 }) ? 'h2' : e.isActive('heading', { level: 3 }) ? 'h3' : e.isActive('heading', { level: 4 }) ? 'h4' : 'p',
        bold: e.isActive('bold'),
        italic: e.isActive('italic'),
        underline: e.isActive('underline'),
        strike: e.isActive('strike'),
        code: e.isActive('code'),
        link: e.isActive('link'),
        bullet: e.isActive('bulletList'),
        ordered: e.isActive('orderedList') && !steps,
        steps,
        quote: e.isActive('blockquote'),
        callout: e.isActive('callout') ? String(e.getAttributes('callout').tone || 'note') : '',
        table: e.isActive('table'),
        canUndo: e.can().undo(),
        canRedo: e.can().redo(),
        headings,
        words: text ? text.split(/\s+/).length : 0,
      };
    },
  });

  // Keep the parent's callback fresh for the editor's long-lived handlers.
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  // Outside changes (starter outline, restored backup, one-click fixes, HTML mode) flow into the editor.
  useEffect(() => {
    if (!editor || value === lastEmitted.current) return;
    lastEmitted.current = value;
    editor.commands.setContent(value || '', { emitUpdate: false });
  }, [editor, value]);

  const actions: BlockActions = useMemo(
    () => ({
      pickImage: () => setImagePanel({ src: '', alt: '', caption: '' }),
      uploadImage: () => fileRef.current?.click(),
      ask: (message, initial) => window.prompt(message, initial),
    }),
    []
  );

  async function insertFiles(files: File[], at?: number) {
    if (!editor || !files.length) return;
    setNotice('');
    setUploading((n) => n + files.length);
    let pos = at;
    for (const file of files) {
      try {
        const src = await uploadImage(file);
        const node = { type: 'figure', attrs: { src, alt: altFromFileName(file.name) } };
        if (pos !== undefined) editor.chain().focus().insertContentAt(pos, node).run();
        else editor.chain().focus().insertContent(node).run();
        pos = undefined;
      } catch (e) {
        setNotice(e instanceof Error ? e.message : 'Image upload failed');
      } finally {
        setUploading((n) => n - 1);
      }
    }
  }

  const slashItems = useMemo(() => (slash ? filterBlocks(slash.query) : []), [slash]);

  function pickBlock(item: BlockItem) {
    if (!editor) return;
    if (slash) {
      editor.chain().focus().deleteRange({ from: slash.from, to: editor.state.selection.from }).run();
      setSlash(null);
    }
    setInsertOpen(false);
    item.run(editor, actions);
  }

  function openLink() {
    if (!editor) return;
    if (editor.state.selection.empty && !editor.isActive('link')) {
      setNotice('Select the words to link first.');
      return;
    }
    setLinkDraft(String(editor.getAttributes('link').href || ''));
  }

  function applyLink(href: string) {
    if (!editor) return;
    const chain = editor.chain().focus().extendMarkRange('link');
    if (href.trim()) chain.setLink({ href: href.trim() }).run();
    else chain.unsetLink().run();
    setLinkDraft(null);
  }

  // Handlers the editor calls; refreshed every render so they see current state.
  useEffect(() => {
    pasteRef.current = (event) => {
      if (!editor) return false;
      const files = imageFiles(event.clipboardData?.files);
      if (files.length) {
        event.preventDefault();
        void insertFiles(files);
        return true;
      }
      const html = event.clipboardData?.getData('text/html') || '';
      const text = event.clipboardData?.getData('text/plain') || '';
      if (!html && isValidYoutubeUrl(text.trim()) && !/\s/.test(text.trim()) && editor.state.selection.empty) {
        editor.chain().focus().setYoutubeVideo({ src: text.trim() }).run();
        return true;
      }
      if (!html && text && looksLikeMarkdown(text) && !editor.isActive('codeBlock')) {
        editor.chain().focus().insertContent(markdownToHtml(text)).run();
        setNotice('Markdown converted to formatted text.');
        return true;
      }
      return false;
    };
    dropRef.current = (event, moved) => {
      if (!editor || moved) return false;
      const files = imageFiles(event.dataTransfer?.files);
      if (!files.length) return false;
      event.preventDefault();
      const at = editor.view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos;
      void insertFiles(files, at);
      return true;
    };
    keyRef.current = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        openLink();
        return true;
      }
      if (!slash || !slashItems.length) return false;
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        const step = event.key === 'ArrowDown' ? 1 : -1;
        setSlashIndex((i) => (i + step + slashItems.length) % slashItems.length);
        return true;
      }
      if (event.key === 'Enter' || event.key === 'Tab') {
        pickBlock(slashItems[Math.min(slashIndex, slashItems.length - 1)]);
        return true;
      }
      if (event.key === 'Escape') {
        slashDismissed.current = slash.from;
        setSlash(null);
        return true;
      }
      return false;
    };
  });

  useEffect(() => {
    if (!editor) return;
    let lastQuery = '';
    const update = () => {
      const found = findSlash(editor);
      if (!found) slashDismissed.current = null;
      if (!found || slashDismissed.current === found.from) {
        setSlash(null);
        return;
      }
      if (found.query !== lastQuery) setSlashIndex(0);
      lastQuery = found.query;
      const c = editor.view.coordsAtPos(found.from);
      setSlash({ ...found, left: c.left, top: c.bottom });
    };
    editor.on('selectionUpdate', update);
    editor.on('update', update);
    return () => {
      editor.off('selectionUpdate', update);
      editor.off('update', update);
    };
  }, [editor]);

  function insertLibraryImage() {
    if (!editor || !imagePanel?.src) return;
    editor
      .chain()
      .focus()
      .insertContent({ type: 'figure', attrs: { src: imagePanel.src, alt: imagePanel.alt.trim(), caption: imagePanel.caption.trim() } })
      .run();
    setImagePanel(null);
  }

  function goTo(pos: number) {
    if (!editor) return;
    editor.chain().focus().setTextSelection(pos + 1).run();
    const dom = editor.view.nodeDOM(pos);
    if (dom instanceof HTMLElement) dom.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  const s = snap;
  const minutes = Math.max(1, Math.ceil((s?.words || 0) / 220));
  const tb = editor && s && mode === 'visual';

  return (
    <div className={`abl-rich${focus ? ' is-focus' : ''}`}>
      <div className="abl-rich-bar">
        <div className="abl-tb" role="toolbar" aria-label="Formatting">
          {tb ? (
            <>
              <select
                className="abl-tb-select"
                aria-label="Text style"
                value={s.block}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === 'p') editor.chain().focus().setParagraph().run();
                  else editor.chain().focus().setHeading({ level: Number(v.slice(1)) as 2 | 3 | 4 }).run();
                }}
              >
                <option value="p">Text</option>
                <option value="h2">Section heading</option>
                <option value="h3">Sub-heading</option>
                <option value="h4">Small heading</option>
              </select>
              <span className="abl-tb-sep" aria-hidden />
              <Tool title="Bold (Ctrl+B)" on={s.bold} onRun={() => editor.chain().focus().toggleBold().run()}>
                <b>B</b>
              </Tool>
              <Tool title="Italic (Ctrl+I)" on={s.italic} onRun={() => editor.chain().focus().toggleItalic().run()}>
                <i>I</i>
              </Tool>
              <Tool title="Underline (Ctrl+U)" on={s.underline} onRun={() => editor.chain().focus().toggleUnderline().run()}>
                <u>U</u>
              </Tool>
              <Tool title="Strikethrough" on={s.strike} onRun={() => editor.chain().focus().toggleStrike().run()}>
                <s>S</s>
              </Tool>
              <Tool title="Inline code" on={s.code} onRun={() => editor.chain().focus().toggleCode().run()}>
                {'</>'}
              </Tool>
              <Tool title="Link (Ctrl+K)" on={s.link} onRun={openLink}>
                Link
              </Tool>
              <span className="abl-tb-sep" aria-hidden />
              <Tool title="Bulleted list" on={s.bullet} onRun={() => editor.chain().focus().toggleBulletList().run()}>
                •≡
              </Tool>
              <Tool title="Numbered list" on={s.ordered} onRun={() => editor.chain().focus().toggleOrderedList().run()}>
                1≡
              </Tool>
              <Tool title="Steps (numbered timeline)" on={s.steps} onRun={() => BLOCKS.find((b) => b.id === 'steps')?.run(editor, actions)}>
                ①②
              </Tool>
              <Tool title="Pull quote" on={s.quote} onRun={() => editor.chain().focus().toggleBlockquote().run()}>
                ❝
              </Tool>
              <Tool title="Callout box" on={Boolean(s.callout)} onRun={() => (s.callout ? unwrap(editor, 'callout') : editor.chain().focus().wrapIn('callout', { tone: 'note' }).run())}>
                ⓘ Box
              </Tool>
              <span className="abl-tb-sep" aria-hidden />
              <div className="abl-tb-insert">
                <Tool title="Insert a block (or type / in the text)" on={insertOpen} onRun={() => setInsertOpen((o) => !o)} wide>
                  + Insert
                </Tool>
                {insertOpen ? (
                  <>
                    <div className="abl-pop-backdrop" onClick={() => setInsertOpen(false)} aria-hidden />
                    <div className="abl-pop">
                      <BlockList items={[...BLOCKS]} onPick={pickBlock} />
                    </div>
                  </>
                ) : null}
              </div>
              <Tool title="Undo (Ctrl+Z)" disabled={!s.canUndo} onRun={() => editor.chain().focus().undo().run()}>
                ↶
              </Tool>
              <Tool title="Redo (Ctrl+Shift+Z)" disabled={!s.canRedo} onRun={() => editor.chain().focus().redo().run()}>
                ↷
              </Tool>
            </>
          ) : mode === 'html' ? (
            <span className="abl-tb-note">HTML source — switch back to Visual to keep formatting with the toolbar.</span>
          ) : (
            <span className="abl-tb-note">Loading editor…</span>
          )}
        </div>
        <div className="abl-rich-modes">
          <div className="abl-seg" role="tablist" aria-label="Editor view">
            <button type="button" role="tab" aria-selected={mode === 'visual'} className={mode === 'visual' ? 'is-on' : ''} onClick={() => setMode('visual')}>
              Visual
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'html'}
              className={mode === 'html' ? 'is-on' : ''}
              onClick={() => {
                setSource(prettyHtml(value));
                setMode('html');
              }}
            >
              HTML
            </button>
          </div>
          <button type="button" className="abl-focus-btn" title={focus ? 'Exit focus mode (Esc)' : 'Focus mode — just you and the words'} onClick={() => onFocusChange(!focus)}>
            {focus ? '⤡ Exit focus' : '⤢ Focus'}
          </button>
        </div>
      </div>

      {tb && (s.callout || s.table || s.ordered || s.steps) ? (
        <div className="abl-ctx" role="toolbar" aria-label="Block options">
          {s.callout ? (
            <>
              <span className="abl-ctx-label">Box</span>
              {CALLOUT_TONES.map((t) => (
                <Tool key={t.value} title={t.label} on={s.callout === t.value} onRun={() => editor.chain().focus().updateAttributes('callout', { tone: t.value }).run()} wide>
                  <span className={`abl-tone-dot is-${t.value}`} aria-hidden /> {t.label}
                </Tool>
              ))}
              <Tool title="Remove the box, keep the text" onRun={() => unwrap(editor, 'callout')} wide>
                Unbox
              </Tool>
            </>
          ) : null}
          {s.table ? (
            <>
              <span className="abl-ctx-label">Table</span>
              <Tool title="Add a row below" onRun={() => editor.chain().focus().addRowAfter().run()} wide>
                + Row
              </Tool>
              <Tool title="Add a column to the right" onRun={() => editor.chain().focus().addColumnAfter().run()} wide>
                + Column
              </Tool>
              <Tool title="Delete this row" onRun={() => editor.chain().focus().deleteRow().run()} wide>
                − Row
              </Tool>
              <Tool title="Delete this column" onRun={() => editor.chain().focus().deleteColumn().run()} wide>
                − Column
              </Tool>
              <Tool title="First row as headings" onRun={() => editor.chain().focus().toggleHeaderRow().run()} wide>
                Header row
              </Tool>
              <Tool title="Delete the table" onRun={() => editor.chain().focus().deleteTable().run()} wide>
                Delete table
              </Tool>
            </>
          ) : null}
          {s.ordered || s.steps ? (
            <>
              <span className="abl-ctx-label">Numbered list</span>
              <Tool title="Plain numbers" on={s.ordered} onRun={() => editor.chain().focus().updateAttributes('orderedList', { variant: null }).run()} wide>
                1. 2. 3.
              </Tool>
              <Tool title="Step-by-step timeline" on={s.steps} onRun={() => editor.chain().focus().updateAttributes('orderedList', { variant: 'steps' }).run()} wide>
                Steps timeline
              </Tool>
            </>
          ) : null}
        </div>
      ) : null}

      {imagePanel ? (
        <div className="abl-body-image">
          <MediaPicker label="Image" value={imagePanel.src} onChange={(src) => setImagePanel((p) => (p ? { ...p, src } : p))} kinds={['image', 'svg']} allowUpload compact />
          <div className="admin-form-grid">
            <div className="admin-field">
              <label htmlFor="abl-img-alt">Alt text (what the image shows)</label>
              <input id="abl-img-alt" className="admin-input" value={imagePanel.alt} onChange={(e) => setImagePanel((p) => (p ? { ...p, alt: e.target.value } : p))} />
            </div>
            <div className="admin-field">
              <label htmlFor="abl-img-cap">Caption (optional)</label>
              <input id="abl-img-cap" className="admin-input" value={imagePanel.caption} onChange={(e) => setImagePanel((p) => (p ? { ...p, caption: e.target.value } : p))} />
            </div>
          </div>
          <div className="abl-body-image-actions">
            <button type="button" className="admin-btn admin-btn-primary" disabled={!imagePanel.src} onClick={insertLibraryImage}>
              Insert at cursor
            </button>
            <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setImagePanel(null)}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          void insertFiles(imageFiles(e.target.files));
          e.target.value = '';
        }}
      />

      <div className={`abl-rich-canvas blg-article ${canvasClass}`} style={canvasStyle} hidden={mode !== 'visual'}>
        <EditorContent editor={editor} />
      </div>
      {mode === 'html' ? (
        <textarea
          className="admin-textarea abl-body-src"
          value={source}
          spellCheck={false}
          aria-label="Article body (HTML)"
          onChange={(e) => {
            setSource(e.target.value);
            onChange(e.target.value);
          }}
        />
      ) : null}

      {editor ? (
        <BubbleMenu
          editor={editor}
          options={{ placement: 'top' }}
          shouldShow={({ editor: e, from, to }) =>
            e.isEditable && !e.isActive('figure') && !e.isActive('buttonBlock') && !e.isActive('codeBlock') && (from !== to || e.isActive('link'))
          }
        >
          <div className="abl-bubble">
            {linkDraft !== null ? (
              <form
                className="abl-bubble-link"
                onSubmit={(e) => {
                  e.preventDefault();
                  applyLink(linkDraft);
                }}
              >
                <input
                  autoFocus
                  value={linkDraft}
                  placeholder="https://… or /products/…"
                  aria-label="Link address"
                  onChange={(e) => setLinkDraft(e.target.value)}
                  onKeyDown={(e) => e.key === 'Escape' && setLinkDraft(null)}
                />
                <button type="submit">Apply</button>
                {s?.link ? (
                  <button type="button" onClick={() => applyLink('')}>
                    Remove
                  </button>
                ) : null}
              </form>
            ) : (
              <>
                <Tool title="Bold" on={s?.bold} onRun={() => editor.chain().focus().toggleBold().run()}>
                  <b>B</b>
                </Tool>
                <Tool title="Italic" on={s?.italic} onRun={() => editor.chain().focus().toggleItalic().run()}>
                  <i>I</i>
                </Tool>
                <Tool title="Underline" on={s?.underline} onRun={() => editor.chain().focus().toggleUnderline().run()}>
                  <u>U</u>
                </Tool>
                <Tool title="Inline code" on={s?.code} onRun={() => editor.chain().focus().toggleCode().run()}>
                  {'</>'}
                </Tool>
                <Tool title={s?.link ? 'Edit link' : 'Add link'} on={s?.link} onRun={openLink} wide>
                  {s?.link ? 'Edit link' : 'Link'}
                </Tool>
                <span className="abl-tb-sep" aria-hidden />
                <Tool title="Section heading" on={s?.block === 'h2'} onRun={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
                  H2
                </Tool>
                <Tool title="Sub-heading" on={s?.block === 'h3'} onRun={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
                  H3
                </Tool>
                <Tool title="Pull quote" on={s?.quote} onRun={() => editor.chain().focus().toggleBlockquote().run()}>
                  ❝
                </Tool>
                <Tool title="Callout box" on={Boolean(s?.callout)} onRun={() => editor.chain().focus().wrapIn('callout', { tone: 'note' }).run()}>
                  ⓘ
                </Tool>
              </>
            )}
          </div>
        </BubbleMenu>
      ) : null}

      {slash && slashItems.length && typeof document !== 'undefined'
        ? createPortal(
            <div className="abl-slash" style={{ left: Math.min(slash.left, window.innerWidth - 330), top: Math.min(slash.top + 6, window.innerHeight - 340) }}>
              <BlockList items={slashItems} active={Math.min(slashIndex, slashItems.length - 1)} onPick={pickBlock} onHover={setSlashIndex} />
              <p className="abl-slash-foot">↑↓ to move · Enter to insert · Esc to close</p>
            </div>,
            document.body
          )
        : null}

      <div className="abl-body-foot">
        <span>
          <strong>{(s?.words || 0).toLocaleString('en-IN')}</strong> words
        </span>
        <span>
          <strong>{minutes}</strong> min read
        </span>
        <span>
          <strong>{s?.headings.length || 0}</strong> heading{s?.headings.length === 1 ? '' : 's'}
        </span>
        {uploading ? <span className="abl-foot-busy">Uploading {uploading} image{uploading === 1 ? '' : 's'}…</span> : null}
        {notice ? <span className="abl-foot-note">{notice}</span> : null}
        <span className="abl-foot-tip">Type / for blocks · paste or drop images · Ctrl+K links</span>
      </div>
      {s?.headings.length ? (
        <ol className="abl-outline" aria-label="Contents — click to jump">
          {s.headings.map((h) => (
            <li key={h.pos} className={h.level > 2 ? 'is-sub' : undefined}>
              <button type="button" onClick={() => goTo(h.pos)}>
                {h.text}
              </button>
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}
