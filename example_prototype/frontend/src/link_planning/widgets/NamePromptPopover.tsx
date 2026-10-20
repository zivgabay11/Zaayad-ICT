import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface Props {
    title: string;
    placeholder: string;
    initialValue?: string;
    onConfirm: (name: string) => void;
    onCancel: () => void;
}

// Small floating popover asking for a name right after a draw/placement action completes —
// styled like diagram/widgets/ElementAssignPopover.tsx (centered over the map, z-[2000]).
// Reused for naming a newly-drawn Link Cell/platform, and (via initialValue) for renaming
// an existing one from its right-click context menu.
export const NamePromptPopover: React.FC<Props> = ({ title, placeholder, initialValue, onConfirm, onCancel }) => {
    const { t } = useTranslation();
    const [name, setName] = useState(initialValue ?? '');

    const handleConfirm = () => {
        const trimmed = name.trim();
        if (trimmed) onConfirm(trimmed);
    };

    return (
        <div className="absolute top-1/2 start-1/2 -translate-x-1/2 -translate-y-1/2 z-[2000] bg-white dark:bg-zinc-800 rounded-xl shadow-2xl border border-slate-200 dark:border-zinc-600 p-4 min-w-[260px]">
            <h4 className="text-sm font-semibold text-slate-800 dark:text-zinc-200 mb-3">{title}</h4>
            <input
                type="text"
                autoFocus
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleConfirm(); }}
                placeholder={placeholder}
                className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-primary mb-3"
            />
            <div className="flex gap-2">
                <button
                    onClick={onCancel}
                    className="flex-1 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-zinc-300 bg-slate-100 dark:bg-zinc-700 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-600 transition-colors"
                >
                    {t('Cancel')}
                </button>
                <button
                    onClick={handleConfirm}
                    disabled={!name.trim()}
                    className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {t('diagram.confirm')}
                </button>
            </div>
        </div>
    );
};
