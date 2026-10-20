import React from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, Pencil, Trash2, Repeat, Link2, Unlink } from 'lucide-react';
import { COMBAT_LOG_TYPE_COLORS, COMBAT_LOG_SEVERITY_COLOR } from '../../common/utilities/combatLog';
import { getCellLabel } from '../../common/utilities/cells';
import { TaskLogItem } from '../utilities/personalTaskLog';
import {
    PERSONAL_TASK_STATUS_ACCENT,
    PERSONAL_TASK_STATUS_BADGE_CLASS,
    PERSONAL_TASK_SEVERITY_DOT_COLOR,
} from '../utilities/personalTaskLog';

interface TaskCardProps {
    item: TaskLogItem;
    onView: () => void;
    onEdit: () => void;
    onRemove: () => void;
}

function formatDateTime(iso: string, locale: string): string {
    const d = new Date(iso);
    const date = d.toLocaleDateString(locale === 'he' ? 'he-IL' : 'en-GB', { day: 'numeric', month: 'numeric', year: '2-digit' });
    const time = d.toLocaleTimeString(locale === 'he' ? 'he-IL' : 'en-GB', { hour: '2-digit', minute: '2-digit' });
    return `${date} | ${time}`;
}

export const TaskCard: React.FC<TaskCardProps> = ({ item, onView, onEdit, onRemove }) => {
    const { t, i18n } = useTranslation();

    const title = item.kind === 'manual' ? item.task.title : item.event.title;
    const description = item.kind === 'manual' ? item.task.description : item.event.description;
    const start = item.kind === 'manual' ? item.task.start : item.event.start;
    const severityDotColor = item.kind === 'manual'
        ? PERSONAL_TASK_SEVERITY_DOT_COLOR[item.task.severity]
        : (item.event.severity ? COMBAT_LOG_SEVERITY_COLOR[item.event.severity] : undefined);

    return (
        <div
            draggable
            onDragStart={(e) => {
                e.dataTransfer.setData('text/plain', item.id);
                e.dataTransfer.effectAllowed = 'move';
            }}
            onDoubleClick={onView}
            className="relative flex items-stretch gap-3 ps-4 pe-3 py-3 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 overflow-hidden cursor-grab active:cursor-grabbing"
        >
            <span
                className="absolute inset-y-0 start-0 w-1 rounded-s-xl"
                style={{ background: PERSONAL_TASK_STATUS_ACCENT[item.status] }}
            />
            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                    <h4 className="text-[15px] font-bold text-slate-900 dark:text-white truncate">{title}</h4>
                    {start && (
                        <span className="text-xs text-slate-400 dark:text-zinc-500 whitespace-nowrap shrink-0">
                            {formatDateTime(start, i18n.language)}
                        </span>
                    )}
                </div>
                {description && (
                    <p className="text-sm text-slate-500 dark:text-zinc-400 mt-0.5 truncate">{description}</p>
                )}

                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    <span
                        className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${PERSONAL_TASK_STATUS_BADGE_CLASS[item.status]}`}
                    >
                        {severityDotColor && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: severityDotColor }} />}
                        {t(`personalTaskLog.statuses.${item.status}`)}
                    </span>

                    {item.kind === 'manual' && (
                        <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full border border-slate-300/60 dark:border-zinc-600/60 bg-black/5 dark:bg-white/5 text-slate-600 dark:text-zinc-300">
                            {getCellLabel(t, item.task.ownerCell)}
                        </span>
                    )}

                    {item.kind === 'manual' && item.task.recurrence === 'periodic' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border border-violet-400/40 bg-violet-500/10 text-violet-600 dark:text-violet-300">
                            <Repeat className="w-3 h-3" />
                            {t('personalTaskLog.recurrence.periodic')}
                        </span>
                    )}

                    {item.kind === 'linked' && (
                        <span
                            className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border"
                            style={{
                                background: `${COMBAT_LOG_TYPE_COLORS[item.event.type]}1f`,
                                borderColor: `${COMBAT_LOG_TYPE_COLORS[item.event.type]}55`,
                                color: COMBAT_LOG_TYPE_COLORS[item.event.type],
                            }}
                        >
                            <Link2 className="w-3 h-3" />
                            {t(`combatLog.logTypes.${item.event.type}`)}
                        </span>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-0.5 shrink-0">
                <button
                    onClick={onView}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                    title={t('personalTaskLog.actions.view')}
                >
                    <Eye className="w-3.5 h-3.5" />
                </button>
                <button
                    onClick={onEdit}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                    title={t('personalTaskLog.actions.edit')}
                >
                    <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                    onClick={onRemove}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                    title={t(item.kind === 'manual' ? 'personalTaskLog.actions.delete' : 'personalTaskLog.actions.unassign')}
                >
                    {item.kind === 'manual' ? <Trash2 className="w-3.5 h-3.5" /> : <Unlink className="w-3.5 h-3.5" />}
                </button>
            </div>
        </div>
    );
};
