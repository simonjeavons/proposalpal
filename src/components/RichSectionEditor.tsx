import React, { useEffect, useMemo, useState } from 'react';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { sanitizeNdaHtml } from '@/lib/sanitizeNdaHtml';
import { Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, Undo, Redo, ChevronDown, ChevronRight, RotateCcw, Trash2, Plus, ArrowUp, ArrowDown } from 'lucide-react';

export interface NdaSection { heading: string; body: string }

interface Props {
  sections: NdaSection[];
  onChange: (next: NdaSection[]) => void;
  templateSections?: NdaSection[]; // when present, enables per-section + global reset
  allowStructuralEdits?: boolean;  // add/remove/reorder sections (template editor)
}

function SectionEditor({
  section,
  onChange,
}: {
  section: NdaSection;
  onChange: (next: NdaSection) => void;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
      }),
      Underline,
    ],
    content: section.body || '<p></p>',
    onUpdate: ({ editor: ed }: { editor: Editor }) => {
      onChange({ ...section, body: sanitizeNdaHtml(ed.getHTML()) });
    },
  }, []);

  // If section.body changes externally (e.g. reset to template), sync editor content.
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (current !== section.body) {
      editor.commands.setContent(section.body || '<p></p>', false);
    }
  }, [section.body, editor]);

  if (!editor) return null;

  const btn = (active: boolean, onClick: () => void, label: React.ReactNode, title: string) => (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      className={`h-7 w-7 grid place-items-center rounded text-xs ${active ? 'bg-secondary text-white' : 'hover:bg-muted'}`}
    >{label}</button>
  );

  return (
    <div className="rounded border bg-white">
      <div className="flex flex-wrap items-center gap-1 border-b px-2 py-1">
        {btn(editor.isActive('bold'), () => editor.chain().focus().toggleBold().run(), <Bold size={13} />, 'Bold')}
        {btn(editor.isActive('italic'), () => editor.chain().focus().toggleItalic().run(), <Italic size={13} />, 'Italic')}
        {btn(editor.isActive('underline'), () => editor.chain().focus().toggleUnderline().run(), <UnderlineIcon size={13} />, 'Underline')}
        <span className="mx-1 h-4 w-px bg-border" />
        {btn(editor.isActive('bulletList'), () => editor.chain().focus().toggleBulletList().run(), <List size={13} />, 'Bullet list')}
        {btn(editor.isActive('orderedList'), () => editor.chain().focus().toggleOrderedList().run(), <ListOrdered size={13} />, 'Numbered list')}
        <span className="mx-1 h-4 w-px bg-border" />
        {btn(false, () => editor.chain().focus().undo().run(), <Undo size={13} />, 'Undo')}
        {btn(false, () => editor.chain().focus().redo().run(), <Redo size={13} />, 'Redo')}
      </div>
      <EditorContent editor={editor} className="prose prose-sm max-w-none px-3 py-2 min-h-[120px] text-sm [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_ul]:pl-5 [&_ol]:pl-5 focus-within:outline-none" />
    </div>
  );
}

export function RichSectionEditor({ sections, onChange, templateSections, allowStructuralEdits = false }: Props) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const tplByHeading = useMemo(() => {
    const map = new Map<string, NdaSection>();
    (templateSections || []).forEach(s => map.set(s.heading, s));
    return map;
  }, [templateSections]);

  const updateAt = (i: number, next: NdaSection) => {
    const copy = sections.slice();
    copy[i] = next;
    onChange(copy);
  };

  const resetOne = (i: number) => {
    const tpl = tplByHeading.get(sections[i].heading);
    if (!tpl) return;
    updateAt(i, { ...tpl });
  };

  const resetAll = () => {
    if (!templateSections) return;
    if (!window.confirm('Reset every section to the template text? Any edits will be lost.')) return;
    onChange(templateSections.map(s => ({ ...s })));
  };

  const addSection = () => {
    const copy = sections.slice();
    copy.push({ heading: 'New section', body: '<p></p>' });
    onChange(copy);
    setOpenIndex(copy.length - 1);
  };

  const removeAt = (i: number) => {
    if (!window.confirm('Delete this section?')) return;
    const copy = sections.slice();
    copy.splice(i, 1);
    onChange(copy);
    setOpenIndex(null);
  };

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= sections.length) return;
    const copy = sections.slice();
    [copy[i], copy[j]] = [copy[j], copy[i]];
    onChange(copy);
    setOpenIndex(j);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {templateSections ? 'Edits apply to this NDA only. ' : ''}
          The token <code className="px-1 py-0.5 bg-muted rounded">{'{{CONFIDENTIALITY_YEARS}}'}</code> is replaced at signing time.
        </p>
        <div className="flex gap-2">
          {templateSections && (
            <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={resetAll}>
              <RotateCcw size={12} className="mr-1" /> Reset all
            </Button>
          )}
          {allowStructuralEdits && (
            <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={addSection}>
              <Plus size={12} className="mr-1" /> Add section
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        {sections.map((section, i) => {
          const open = openIndex === i;
          const hasOverride = templateSections && tplByHeading.get(section.heading)
            ? tplByHeading.get(section.heading)!.body !== section.body
            : false;
          return (
            <div key={i} className="rounded border bg-white">
              <button
                type="button"
                onClick={() => setOpenIndex(open ? null : i)}
                className="flex w-full items-center gap-2 px-2 py-1.5 text-left hover:bg-muted/40"
              >
                {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <span className="text-sm font-medium flex-1 truncate">{section.heading || '(untitled section)'}</span>
                {hasOverride && <span className="text-[10px] uppercase tracking-wide rounded bg-amber-100 text-amber-800 px-1.5 py-0.5">edited</span>}
              </button>
              {open && (
                <div className="border-t p-2 space-y-2">
                  <div className="flex gap-2 items-center">
                    <Input
                      value={section.heading}
                      onChange={(e) => updateAt(i, { ...section, heading: e.target.value })}
                      className="h-8 text-sm font-medium"
                      placeholder="Section heading"
                    />
                    {allowStructuralEdits && (
                      <>
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => move(i, -1)} title="Move up"><ArrowUp size={14} /></Button>
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => move(i, 1)} title="Move down"><ArrowDown size={14} /></Button>
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeAt(i)} title="Delete section"><Trash2 size={14} /></Button>
                      </>
                    )}
                  </div>
                  <SectionEditor section={section} onChange={(next) => updateAt(i, next)} />
                  {templateSections && tplByHeading.get(section.heading) && (
                    <div className="flex justify-end">
                      <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => resetOne(i)}>
                        <RotateCcw size={12} className="mr-1" /> Reset this section to template
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
