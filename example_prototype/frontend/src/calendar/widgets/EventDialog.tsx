import React, { useState, useEffect } from 'react';
import { CalendarEvent } from '../../common/utilities/types';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';

interface EventDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (event: CalendarEvent) => void;
    onDelete?: (id: string) => void;
    initialEvent?: CalendarEvent | null;
    defaultDate?: string;
    defaultLevel?: string;
}

export const EventDialog: React.FC<EventDialogProps> = ({
    isOpen,
    onClose,
    onSave,
    onDelete,
    initialEvent,
    defaultDate,
    defaultLevel
}) => {
    const { t, i18n } = useTranslation();
    const [title, setTitle] = useState<Record<string, string>>({ en: '' });
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [level, setLevel] = useState('command');
    const [location, setLocation] = useState('');

    useEffect(() => {
        if (isOpen) {
            if (initialEvent) {
                setTitle(initialEvent.title || { en: '' });
                setDate(initialEvent.date);
                setTime(initialEvent.time || '');
                setLevel(initialEvent.level);
                setLocation(initialEvent.location || '');
            } else {
                setTitle({ en: '' });
                setDate(defaultDate || new Date().toISOString().split('T')[0]);
                setTime('12:00');
                setLevel(defaultLevel || 'command');
                setLocation('');
            }
        }
    }, [isOpen, initialEvent, defaultDate, defaultLevel]);

    if (!isOpen) return null;

    const handleSave = () => {
        if (!title['en']?.trim() || !date) return;

        onSave({
            id: initialEvent?.id || `evt-${Date.now()}`,
            title,
            date,
            time,
            level,
            location
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm rtl:text-right">
            <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-xl w-full max-w-md p-6 m-4 relative animate-in fade-in zoom-in-95 duration-200">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 rtl:right-auto rtl:left-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-700 rounded-full transition-colors"
                >
                    <X size={20} />
                </button>

                <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6">
                    {initialEvent ? t('calendar.editEvent') : t('calendar.addEvent')}
                </h2>

                <div className="space-y-4 mb-8">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1">
                            {t('calendar.eventName')}
                        </label>
                        <input
                            type="text"
                            value={title?.[i18n.language] || title?.['en'] || ''}
                            onChange={(e) => setTitle({ ...title, [i18n.language]: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder={t('calendar.eventName')}
                        />
                    </div>

                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1">
                                {t('calendar.date')}
                            </label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1">
                                {t('calendar.time')}
                            </label>
                            <input
                                type="time"
                                value={time}
                                onChange={(e) => setTime(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1">
                            {t('calendar.level')}
                        </label>
                        <select
                            value={level}
                            onChange={(e) => setLevel(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                            <option value="command">{t('calendar.levels.command')}</option>
                            <option value="division">{t('calendar.levels.division')}</option>
                            <option value="brigade">{t('calendar.levels.brigade')}</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1">
                            {t('calendar.location')}
                        </label>
                        <input
                            type="text"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    {initialEvent && onDelete ? (
                        <button
                            onClick={() => { onDelete(initialEvent.id); onClose(); }}
                            className="px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-zinc-700 font-medium rounded-lg transition-colors"
                        >
                            {t('calendar.delete')}
                        </button>
                    ) : <div></div>}

                    <div className="flex gap-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-700 font-medium rounded-lg transition-colors"
                        >
                            {t('calendar.cancel')}
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={!title['en']?.trim()}
                            className="px-6 py-2 bg-primary hover:opacity-90 disabled:opacity-50 text-white dark:text-zinc-900 font-medium rounded-lg transition-colors"
                        >
                            {t('calendar.save')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};