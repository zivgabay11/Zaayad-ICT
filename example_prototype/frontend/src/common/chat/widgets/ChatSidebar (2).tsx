import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Smile, Paperclip, X, Send, AlertCircle, PanelLeftClose } from 'lucide-react';
import { Message, Attachment } from '../../utilities/types';
import { TypewriterText } from '../../widgets/TypewriterText';

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

interface ChatSidebarProps {
    messages: Message[];
    isTyping: boolean;
    onSend: (text: string, attachments: Attachment[]) => void;
    onHide?: () => void;
    placeholder?: string;
    disclaimer?: string;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
    messages,
    isTyping,
    onSend,
    onHide,
    placeholder = "Your Message",
    disclaimer = "Horus AI Agent can make mistakes, so double-check it."
}) => {
    const [inputValue, setInputValue] = useState('');
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [fileError, setFileError] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    // Listen for document capture events from CropOverlay
    useEffect(() => {
        const handleDocCapture = (e: Event) => {
            const { base64, mimeType, name } = (e as CustomEvent).detail;
            setAttachments(prev => [...prev, { base64, mimeType, name }]);
            // Focus the textarea so user can type their question
            setTimeout(() => textareaRef.current?.focus(), 100);
        };
        document.addEventListener('doc-capture-to-chat', handleDocCapture);
        return () => document.removeEventListener('doc-capture-to-chat', handleDocCapture);
    }, []);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;
        setFileError(null);

        const newAttachments: Attachment[] = [];
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (file.size > MAX_FILE_SIZE) {
                setFileError(`File "${file.name}" exceeds 20MB limit.`);
                continue;
            }
            const reader = new FileReader();

            const base64Promise = new Promise<string>((resolve) => {
                reader.onload = () => {
                    const base64String = (reader.result as string).split(',')[1];
                    resolve(base64String);
                };
            });

            reader.readAsDataURL(file);
            const base64 = await base64Promise;

            newAttachments.push({
                file,
                base64,
                mimeType: file.type,
                name: file.name
            });
        }

        setAttachments(prev => [...prev, ...newAttachments]);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const removeAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const handleSendAction = () => {
        if (!inputValue.trim() && attachments.length === 0) return;
        onSend(inputValue, attachments);
        setInputValue('');
        setAttachments([]);
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }
    };

    return (
        <div className="w-full flex flex-col h-full transition-colors duration-200">
            {onHide && (
                <div className="flex items-center justify-between px-4 pt-3 pb-1">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-zinc-300">
                        <Sparkles className="w-4 h-4" />
                        <span>Horus AI</span>
                    </div>
                    <button
                        onClick={onHide}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                        title="Hide Chat"
                    >
                        <PanelLeftClose className="w-4 h-4" />
                    </button>
                </div>
            )}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.role === 'ai' ? (
                            <>
                                <div className="w-6 h-6 mr-3 shrink-0 mt-0.5 text-slate-700 dark:text-zinc-300">
                                    <Sparkles className="w-5 h-5 fill-current" />
                                </div>
                                <div className="text-sm text-slate-800 dark:text-zinc-200 leading-relaxed">
                                    <TypewriterText text={msg.text} onType={() => messagesEndRef.current?.scrollIntoView()} />
                                </div>
                            </>
                        ) : (
                            <div className="max-w-[90%] flex flex-col items-end gap-2">
                                {msg.text ? (
                                    <div className="flex items-start gap-3 bg-slate-100 dark:bg-zinc-800/50 rounded-2xl px-4 py-3 text-sm text-slate-800 dark:text-zinc-200">
                                        <div className="leading-relaxed">{msg.text}</div>
                                        <div className="shrink-0 text-slate-800 dark:text-zinc-200 mt-0.5">
                                            <Smile className="w-5 h-5" />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-start gap-3">
                                        <div className="flex flex-wrap gap-2 justify-end mt-1">
                                            {msg.attachments?.map((att, i) => (
                                                <div key={i} className="flex items-center gap-1.5 bg-slate-100 dark:bg-zinc-800 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300">
                                                    <Paperclip className="w-3.5 h-3.5" />
                                                    <span className="truncate max-w-[200px]">{att}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="shrink-0 text-slate-800 dark:text-zinc-200 bg-slate-100 dark:bg-zinc-800/50 rounded-full p-2.5">
                                            <Smile className="w-5 h-5" />
                                        </div>
                                    </div>
                                )}

                                {msg.text && msg.attachments && msg.attachments.length > 0 && (
                                    <div className="flex flex-wrap gap-2 justify-end">
                                        {msg.attachmentData?.filter(a => a.mimeType.startsWith('image/')).map((att, i) => (
                                            <img key={`img-${i}`} src={`data:${att.mimeType};base64,${att.base64}`} alt={att.name} className="w-20 h-20 object-cover rounded-lg border border-slate-200 dark:border-zinc-700" />
                                        ))}
                                        {msg.attachments.map((att, i) => (
                                            <div key={i} className="flex items-center gap-1.5 bg-slate-100 dark:bg-zinc-800 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300">
                                                <Paperclip className="w-3.5 h-3.5" />
                                                <span className="truncate max-w-[200px]">{att}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}
                {isTyping && (
                    <div className="flex justify-start">
                        <div className="w-6 h-6 mr-3 shrink-0 mt-0.5 text-slate-700 dark:text-zinc-300">
                            <Sparkles className="w-5 h-5 fill-current" />
                        </div>
                        <div className="flex items-center gap-1 mt-2">
                            <div className="w-1.5 h-1.5 bg-slate-400 dark:bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                            <div className="w-1.5 h-1.5 bg-slate-400 dark:bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                            <div className="w-1.5 h-1.5 bg-slate-400 dark:bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="p-4 transition-colors duration-200">
                {attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                        {attachments.map((att, idx) => (
                            <div key={idx} className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-800 px-2 py-1 rounded-md text-xs border border-slate-200 dark:border-zinc-700">
                                {att.mimeType.startsWith('image/') && (
                                    <img src={`data:${att.mimeType};base64,${att.base64}`} alt={att.name} className="w-8 h-8 object-cover rounded" />
                                )}
                                <span className="truncate max-w-[150px]">{att.name}</span>
                                <button onClick={() => removeAttachment(idx)} className="text-slate-500 hover:text-red-500">
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
                {fileError && (
                    <div className="flex items-center gap-1.5 text-xs text-red-500 mb-2">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>{fileError}</span>
                    </div>
                )}
                <div className="relative flex items-end">
                    <input
                        type="file"
                        multiple
                        accept="image/*,.pdf,.txt,.csv,.json,.xml,.md"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute left-2 bottom-1.5 p-2 text-slate-400 hover:text-cyan-500 transition-colors"
                    >
                        <Paperclip className="w-4 h-4" />
                    </button>
                    <textarea
                        ref={textareaRef}
                        value={inputValue}
                        onChange={(e) => {
                            setInputValue(e.target.value);
                            e.target.style.height = 'auto';
                            e.target.style.height = Math.min(e.target.scrollHeight, 150) + 'px';
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                if (!isTyping) handleSendAction();
                            }
                        }}
                        placeholder={placeholder}
                        rows={1}
                        className="w-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 focus:border-cyan-500 dark:focus:border-cyan-400 focus:ring-1 focus:ring-cyan-500 dark:focus:ring-cyan-400 rounded-3xl pl-10 pr-12 py-3 text-sm transition-all outline-none text-cyan-500 dark:text-cyan-400 placeholder-cyan-400 dark:placeholder-cyan-600 shadow-sm resize-none overflow-y-auto"
                        style={{ minHeight: '46px' }}
                    />
                    <button
                        onClick={handleSendAction}
                        disabled={(!inputValue.trim() && attachments.length === 0) || isTyping}
                        className="absolute right-2 bottom-1.5 p-2 text-cyan-500 dark:text-cyan-400 hover:text-cyan-600 dark:hover:text-cyan-300 disabled:opacity-50 transition-colors"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </div>
                <p className="text-[10px] text-center text-slate-400 dark:text-zinc-500 mt-3 px-4">
                    {disclaimer} <a href="#" className="text-cyan-500 dark:text-cyan-400 hover:underline">Your privacy & terms</a>
                </p>
            </div>
        </div>
    );
};
