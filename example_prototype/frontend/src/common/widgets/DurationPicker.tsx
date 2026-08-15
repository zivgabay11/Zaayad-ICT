import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface DurationPickerProps {
    value?: number;
    onChange: (value?: number) => void;
}

export function formatDuration(totalHours: number | undefined, t: (key: string) => string) {
    if (totalHours === undefined || totalHours === null) return '';
    if (totalHours === 0) return `0${t('common.time.h')}`;
    const isNegative = totalHours < 0;
    const absHours = Math.abs(totalHours);
    const d = Math.floor(absHours / 24);
    const h = absHours % 24;
    
    let parts = [];
    if (d > 0) parts.push(`${d}${t('common.time.d')}`);
    if (h > 0) parts.push(`${h}${t('common.time.h')}`);
    
    return (isNegative ? '-' : '') + parts.join(' ');
}

export function parseDuration(text: string): number | null {
    const s = text.trim().toLowerCase();
    if (!s) return null;

    const isNegative = s.startsWith('-');
    
    // Extract days
    const dMatch = s.match(/(\d+)\s*d/);
    const days = dMatch ? parseInt(dMatch[1], 10) : 0;
    
    // Extract hours
    const hMatch = s.match(/(\d+)\s*h/);
    const hours = hMatch ? parseInt(hMatch[1], 10) : 0;
    
    if (!dMatch && !hMatch) {
         // Allow pure numbers to be interpreted as hours
         const num = parseInt(s.replace('+', ''), 10);
         if (!isNaN(num) && (s === num.toString() || s === '-' + Math.abs(num).toString() || s === '+' + Math.abs(num).toString())) {
             return isNegative ? -Math.abs(num) : Math.abs(num);
         }
         return null;
    }

    let total = (days * 24) + hours;
    return isNegative ? -total : total;
}

export const DurationPicker: React.FC<DurationPickerProps> = ({ value, onChange }) => {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [error, setError] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const isBefore = value !== undefined ? value < 0 : false;
    const absHours = value !== undefined ? Math.abs(value) : 0;
    const d = Math.floor(absHours / 24);
    const h = absHours % 24;

    useEffect(() => {
        if (!isTyping) {
            setInputValue(formatDuration(value, t));
        }
    }, [value, isTyping, t]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleUpdate = (newDays: number, newHours: number, newIsBefore: boolean) => {
        let total = (newDays * 24) + newHours;
        if (newIsBefore) total = -total;
        setError(false);
        onChange(total);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setInputValue(val);
        setIsTyping(true);
        setError(false);
        
        const parsed = parseDuration(val);
        if (parsed !== null) {
            onChange(parsed);
        }
    };

    const commitInput = () => {
        setIsTyping(false);
        if (!inputValue.trim()) {
            setInputValue('');
            onChange(undefined);
            return;
        }

        const parsed = parseDuration(inputValue);
        if (parsed === null) {
            setError(true);
            setInputValue(formatDuration(value, t)); // revert
        } else {
            setInputValue(formatDuration(parsed, t));
            onChange(parsed);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            commitInput();
            setIsOpen(false);
        } else if (e.key === 'Tab') {
            commitInput();
            setIsOpen(false);
        } else if (e.key === 'Escape') {
            setIsOpen(false);
            setInputValue(formatDuration(value, t));
        }
    };

    return (
        <div className="relative" ref={containerRef}>
            <input
                type="text"
                dir="ltr"
                onClick={() => setIsOpen(true)}
                value={inputValue}
                onChange={handleInputChange}
                onBlur={commitInput}
                onKeyDown={handleKeyDown}
                className={`w-full bg-white dark:bg-zinc-900 border rounded px-2 py-1 text-xs outline-none h-[26px] transition-colors rtl:text-right ${error ? 'border-red-500 focus:border-red-500' : 'border-slate-200 dark:border-zinc-700 focus:border-cyan-500'}`}
            />

            {isOpen && (
                <div className="absolute z-50 top-full left-0 rtl:left-auto rtl:right-0 mt-1 w-48 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg shadow-xl p-3 flex flex-col gap-3">
                    <div className="flex bg-slate-100 dark:bg-zinc-900 rounded p-1">
                        <button
                            type="button"
                            tabIndex={-1}
                            className={`flex-1 text-[10px] uppercase font-semibold py-1 rounded transition-colors ${isBefore ? 'bg-white dark:bg-zinc-700 shadow-sm text-cyan-600 dark:text-cyan-400' : 'text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200'}`}
                            onClick={() => handleUpdate(d, h, true)}
                        >
                            {t('common.time.before')}
                        </button>
                        <button
                            type="button"
                            tabIndex={-1}
                            className={`flex-1 text-[10px] uppercase font-semibold py-1 rounded transition-colors ${!isBefore ? 'bg-white dark:bg-zinc-700 shadow-sm text-cyan-600 dark:text-cyan-400' : 'text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200'}`}
                            onClick={() => handleUpdate(d, h, false)}
                        >
                            {t('common.time.after')}
                        </button>
                    </div>

                    <div className="flex gap-2">
                        <div className="flex flex-col gap-1 flex-1">
                            <span className="text-[10px] uppercase text-slate-400 font-semibold px-1">{t('common.time.days')}</span>
                            <input
                                type="number"
                                tabIndex={-1}
                                min="0"
                                className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded px-2 py-1 text-xs outline-none focus:border-cyan-500"
                                value={d}
                                onChange={e => handleUpdate(Math.max(0, parseInt(e.target.value) || 0), h, isBefore)}
                            />
                        </div>
                        <div className="flex flex-col gap-1 flex-1">
                            <span className="text-[10px] uppercase text-slate-400 font-semibold px-1">{t('common.time.hours')}</span>
                            <input
                                type="number"
                                tabIndex={-1}
                                min="0"
                                max="23"
                                className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded px-2 py-1 text-xs outline-none focus:border-cyan-500"
                                value={h}
                                onChange={e => handleUpdate(d, Math.min(23, Math.max(0, parseInt(e.target.value) || 0)), isBefore)}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
