import React, { useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { Markdown } from 'tiptap-markdown';
import { useTranslation } from 'react-i18next';
import { Bold, Italic, List, ListOrdered, Heading1, Heading2, Quote, Undo as UndoIcon, Redo, Check, X, ClipboardPaste, ImagePlus, Code, Eye } from 'lucide-react';

interface RichTextEditorProps {
    value?: string;
    onChange?: (value: string) => void;
    placeholder?: string;
    minHeight?: string;
    className?: string;
    proposedValue?: string;
    onDecision?: (keep: boolean) => void;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({ value = '', onChange, placeholder, minHeight = '150px', className = '', proposedValue, onDecision }) => {
    const { t, i18n } = useTranslation();
    const isRTL = i18n.dir() === 'rtl';
    // Keep internal state to check if value changed externally
    const [initialRender, setInitialRender] = useState(true);
    const hasDiff = proposedValue !== undefined && proposedValue !== value;
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [showSource, setShowSource] = useState(false);
    const [sourceText, setSourceText] = useState('');

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: { levels: [1, 2, 3] },
            }),
            Image.configure({
                inline: true,
                allowBase64: true,
            }),
            Markdown,
        ],
        content: value,
        editable: !hasDiff,
        onUpdate: ({ editor }) => {
            // Check editor.isEditable because hasDiff is captured in this closure on mount.
            // We set editable exactly to !hasDiff in the useEffect below.
            if (onChange && editor.isEditable) {
                // Return markdown string
                onChange((editor.storage as any).markdown.getMarkdown());
            }
        },
        editorProps: {
            attributes: {
                class: `prose dark:prose-invert max-w-none focus:outline-none min-h-[${minHeight}] p-4 text-sm ${hasDiff ? 'opacity-70 pointer-events-none' : ''}`,
            },
            handlePaste: (view, event) => {
                const items = event.clipboardData?.items;
                if (items) {
                    for (let i = 0; i < items.length; i++) {
                        const item = items[i];
                        if (item.type.startsWith('image/')) {
                            event.preventDefault();
                            const file = item.getAsFile();
                            if (!file) continue;
                            const reader = new FileReader();
                            reader.onload = (e) => {
                                const src = e.target?.result as string;
                                if (src) {
                                    view.dispatch(view.state.tr.replaceSelectionWith(
                                        view.state.schema.nodes.image.create({ src })
                                    ));
                                }
                            };
                            reader.readAsDataURL(file);
                            return true;
                        }
                    }
                }

                // Fallback: if no image found in clipboardData.items (happens when image was
                // written via navigator.clipboard.write API), try async clipboard.read()
                const hasText = event.clipboardData?.getData('text/plain') || event.clipboardData?.getData('text/html');
                if (!hasText) {
                    event.preventDefault();
                    navigator.clipboard.read().then(clipboardItems => {
                        for (const ci of clipboardItems) {
                            const imageType = ci.types.find(t => t.startsWith('image/'));
                            if (imageType) {
                                ci.getType(imageType).then(blob => {
                                    const reader = new FileReader();
                                    reader.onload = (e) => {
                                        const src = e.target?.result as string;
                                        if (src) {
                                            view.dispatch(view.state.tr.replaceSelectionWith(
                                                view.state.schema.nodes.image.create({ src })
                                            ));
                                        }
                                    };
                                    reader.readAsDataURL(blob);
                                });
                                return;
                            }
                        }
                    }).catch(() => { /* clipboard read not available or denied */ });
                    return true;
                }

                return false;
            },
            handleDrop: (view, event) => {
                const files = event.dataTransfer?.files;
                if (!files || files.length === 0) return false;
                const file = files[0];
                if (!file.type.startsWith('image/')) return false;
                event.preventDefault();
                const reader = new FileReader();
                reader.onload = (e) => {
                    const src = e.target?.result as string;
                    if (src) {
                        const pos = view.posAtCoords({ left: event.clientX, top: event.clientY });
                        if (pos) {
                            view.dispatch(view.state.tr.insert(
                                pos.pos,
                                view.state.schema.nodes.image.create({ src })
                            ));
                        }
                    }
                };
                reader.readAsDataURL(file);
                return true;
            },
        },
    });

    // Update editable state when hasDiff changes
    useEffect(() => {
        if (editor) {
            editor.setEditable(!hasDiff);
        }
    }, [hasDiff, editor]);

    // Handle external value changes (e.g., initial load)
    useEffect(() => {
        const displayValue = hasDiff ? proposedValue : value;
        if (editor && displayValue !== undefined && initialRender) {
            editor.commands.setContent(displayValue);
            setInitialRender(false);
        }
        // If external value changes and differs from current markdown
        if (editor && !initialRender) {
            const currentMarkdown = (editor.storage as any).markdown.getMarkdown();
            const displayValueStr = displayValue || '';
            if (displayValueStr !== currentMarkdown) {
                editor.commands.setContent(displayValueStr);
            }
        }
    }, [value, proposedValue, editor, initialRender, hasDiff]);

    useEffect(() => {
        if (editor && placeholder && editor.isEmpty) {
            // we could handle placeholder via extension, but keeping simple for now
        }
    }, [editor, placeholder]);

    if (!editor) {
        return null;
    }

    const handlePasteFromClipboard = async () => {
        try {
            const clipboardItems = await navigator.clipboard.read();
            for (const item of clipboardItems) {
                const imageType = item.types.find(t => t.startsWith('image/'));
                if (imageType) {
                    const blob = await item.getType(imageType);
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const src = e.target?.result as string;
                        if (src) {
                            editor.chain().focus().setImage({ src }).run();
                        }
                    };
                    reader.readAsDataURL(blob);
                    return;
                }
            }
        } catch (err) {
            // Fallback: trigger native paste via execCommand
            editor.chain().focus().run();
            document.execCommand('paste');
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const src = ev.target?.result as string;
            if (src) {
                editor.chain().focus().setImage({ src }).run();
            }
        };
        reader.readAsDataURL(file);
        // Reset input so same file can be selected again
        e.target.value = '';
    };

    const toggleSource = () => {
        if (!showSource) {
            // Switching to source mode: get current markdown
            setSourceText((editor.storage as any).markdown.getMarkdown());
            setShowSource(true);
        } else {
            // Switching back to preview: apply source text to editor
            editor.commands.setContent(sourceText);
            if (onChange) {
                onChange(sourceText);
            }
            setShowSource(false);
        }
    };

    const ToolbarButton = ({ onClick, isActive, icon, title }: { onClick: () => void, isActive: boolean, icon: React.ReactNode, title: string }) => (
        <button
            type="button"
            onClick={(e) => {
                e.preventDefault();
                onClick();
            }}
            title={title}
            className={`p-1.5 rounded-md flex items-center justify-center transition-colors ${isActive
                ? 'bg-slate-200 dark:bg-zinc-700 text-slate-900 dark:text-zinc-100'
                : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
                }`}
        >
            {icon}
        </button>
    );

    return (
        <div className={`relative flex flex-col border rounded-md overflow-visible bg-white dark:bg-zinc-900 focus-within:ring-2 focus-within:ring-cyan-500/50 ${hasDiff ? 'border-emerald-400 ring-2 ring-emerald-500/30' : 'border-slate-200 dark:border-zinc-700'} ${className}`}>
            {hasDiff && (
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 z-20 flex items-center bg-white dark:bg-zinc-800 shadow-xl border border-slate-200 dark:border-zinc-700 rounded-lg overflow-hidden shrink-0 p-1 gap-1">
                    <div className="px-3 py-1 flex items-center gap-1.5 rounded cursor-pointer bg-emerald-50 dark:bg-emerald-500/10 text-slate-700 dark:text-zinc-300 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors" onClick={() => onDecision && onDecision(true)}>
                        <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-xs font-medium">{t('common.keep')}</span>
                    </div>
                    <div className="px-3 py-1 flex items-center gap-1.5 rounded cursor-pointer bg-red-50 dark:bg-red-500/10 text-slate-700 dark:text-zinc-300 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors" onClick={() => onDecision && onDecision(false)}>
                        <X className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                        <span className="text-xs font-medium">{t('common.undo')}</span>
                    </div>
                </div>
            )}

            {/* Toolbar */}
            <div className="flex items-center flex-wrap gap-1 p-2 border-b border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/50">
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    isActive={editor.isActive('bold')}
                    icon={<Bold className="w-4 h-4" />}
                    title="Bold"
                />
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    isActive={editor.isActive('italic')}
                    icon={<Italic className="w-4 h-4" />}
                    title="Italic"
                />
                <div className="w-[1px] h-4 bg-slate-200 dark:bg-zinc-700 mx-1" />
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                    isActive={editor.isActive('heading', { level: 1 })}
                    icon={<Heading1 className="w-4 h-4" />}
                    title="Heading 1"
                />
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    isActive={editor.isActive('heading', { level: 2 })}
                    icon={<Heading2 className="w-4 h-4" />}
                    title="Heading 2"
                />
                <div className="w-[1px] h-4 bg-slate-200 dark:bg-zinc-700 mx-1" />
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    isActive={editor.isActive('bulletList')}
                    icon={<List className="w-4 h-4" />}
                    title="Bullet List"
                />
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    isActive={editor.isActive('orderedList')}
                    icon={<ListOrdered className="w-4 h-4" />}
                    title="Ordered List"
                />
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBlockquote().run()}
                    isActive={editor.isActive('blockquote')}
                    icon={<Quote className="w-4 h-4" />}
                    title="Quote"
                />
                <div className="w-[1px] h-4 bg-slate-200 dark:bg-zinc-700 mx-1" />
                <ToolbarButton
                    onClick={handlePasteFromClipboard}
                    isActive={false}
                    icon={<ClipboardPaste className="w-4 h-4" />}
                    title="Paste from Clipboard"
                />
                <ToolbarButton
                    onClick={() => fileInputRef.current?.click()}
                    isActive={false}
                    icon={<ImagePlus className="w-4 h-4" />}
                    title="Insert Image"
                />
                <div className="flex-1" />
                <ToolbarButton
                    onClick={toggleSource}
                    isActive={showSource}
                    icon={showSource ? <Eye className="w-4 h-4" /> : <Code className="w-4 h-4" />}
                    title={showSource ? 'Preview' : 'Markdown Source'}
                />
                <div className="w-[1px] h-4 bg-slate-200 dark:bg-zinc-700 mx-1" />
                <ToolbarButton
                    onClick={() => editor.chain().focus().undo().run()}
                    isActive={false}
                    icon={<UndoIcon className={`w-4 h-4${isRTL ? ' scale-x-[-1]' : ''}`} />}
                    title="Undo"
                />
                <ToolbarButton
                    onClick={() => editor.chain().focus().redo().run()}
                    isActive={false}
                    icon={<Redo className={`w-4 h-4${isRTL ? ' scale-x-[-1]' : ''}`} />}
                    title="Redo"
                />
            </div>

            {/* Hidden file input for image upload */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
            />

            {/* Editor Area */}
            {showSource ? (
                <textarea
                    value={sourceText}
                    onChange={(e) => setSourceText(e.target.value)}
                    className={`w-full p-4 text-sm font-mono bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-zinc-200 resize-none focus:outline-none min-h-[${minHeight}]`}
                    style={{ minHeight }}
                />
            ) : (
                <div className="cursor-text rich-text-editor-content" onClick={() => editor.chain().focus().run()}>
                    <EditorContent editor={editor} />
                </div>
            )}

            {/* Styles for image selection */}
            <style>{`
                .rich-text-editor-content .ProseMirror img {
                    cursor: pointer;
                    border-radius: 4px;
                    transition: outline 0.15s, box-shadow 0.15s;
                    max-width: 100%;
                }
                .rich-text-editor-content .ProseMirror img:hover {
                    outline: 2px solid #94a3b8;
                }
                .rich-text-editor-content .ProseMirror img.ProseMirror-selectednode {
                    outline: 2px solid #6366f1;
                    box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.15);
                }
            `}</style>
        </div>
    );
};
