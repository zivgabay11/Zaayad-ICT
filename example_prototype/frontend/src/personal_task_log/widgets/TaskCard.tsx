import React from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, Repeat, Link2, Unlink, Check } from 'lucide-react';
import { FigmaIcon } from '../../common/widgets/FigmaIcon';
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
    onToggleDone?: () => void;
    onContextMenu?: (e: React.MouseEvent) => void;
}

function formatDateTime(iso: string, locale: string): string {
    const d = new Date(iso);
    const date = d.toLocaleDateString(locale === 'he' ? 'he-IL' : 'en-GB', { day: 'numeric', month: 'numeric', year: '2-digit' });
    const time = d.toLocaleTimeString(locale === 'he' ? 'he-IL' : 'en-GB', { hour: '2-digit', minute: '2-digit' });
    return `${date} | ${time}`;
}

export const TaskCard: React.FC<TaskCardProps> = ({ item, onView, onEdit, onRemove, onToggleDone, onContextMenu }) => {
    const { t, i18n } = useTranslation();

    const title = item.kind === 'manual' ? item.task.title : item.event.title;
    const description = item.kind === 'manual' ? item.task.description : item.event.description;
    const start = item.kind === 'manual' ? item.task.start : item.event.start;
    const severityDotColor = item.kind === 'manual'
        ? PERSONAL_TASK_SEVERITY_DOT_COLOR[item.task.severity]
        : (item.event.severity ? COMBAT_LOG_SEVERITY_COLOR[item.event.severity] : undefined);

    const isDone = item.status === 'done';

    // One wide row (Figma task manager): status stripe on the leading edge, "done" checkbox,
    // bold title over a muted description, then the meta badges, date and actions on the end.
    return (
        <div
            draggable
            onDragStart={(e) => {
                e.dataTransfer.setData('text/plain', item.id);
                e.dataTransfer.effectAllowed = 'move';
            }}
            onDoubleClick={onView}
            onContextMenu={onContextMenu}
            data-task-row={item.id}
            className="relative flex items-center gap-3 ps-4 pe-3 min-h-[56px] w-full rounded-[4px] border overflow-hidden cursor-grab active:cursor-grabbing bg-white border-slate-200 dark:bg-[var(--figma-ptl-card-bg)] dark:border-[var(--figma-ptl-card-border)] shadow-[0_2px_5.5px_rgba(0,0,0,0.02)]"
        >
            <span className="absolute inset-y-0 start-0 w-[3px]" style={{ background: PERSONAL_TASK_STATUS_ACCENT[item.status] }} />

            <button
                type="button"
                role="checkbox"
                aria-checked={isDone}
                title={t('personalTaskLog.markDone')}
                onClick={(e) => { e.stopPropagation(); onToggleDone?.(); }}
                onDoubleClick={(e) => e.stopPropagation()}
                className={`flex items-center justify-center w-3 h-3 rounded-[3px] border shrink-0 transition-colors ${isDone
                    ? 'bg-[var(--figma-ptl-check)] border-[var(--figma-ptl-check)] text-white'
                    : 'border-slate-300 dark:border-[var(--figma-ptl-count-border)] dark:bg-[var(--figma-ptl-checkbox-bg)] hover:border-primary'}`}
            >
                {isDone && <Check className="w-2.5 h-2.5" strokeWidth={3.5} />}
            </button>

            <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold leading-5 text-slate-900 dark:text-white truncate">{title}</h4>
                {description && (
                    <p className="text-xs leading-4 text-slate-500 dark:text-zinc-400 truncate">{description}</p>
                )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
                {item.kind === 'manual' && (
                    <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-[3px] border border-slate-300/60 dark:border-[rgba(217,237,255,0.36)] bg-black/5 dark:bg-black/15 text-slate-600 dark:text-[rgba(241,247,254,0.71)]">
                        {getCellLabel(t, item.task.ownerCell)}
                    </span>
                )}

                {item.kind === 'manual' && item.task.recurrence === 'periodic' && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-[3px] border border-violet-400/40 bg-violet-500/10 text-violet-600 dark:text-violet-300">
                        <Repeat className="w-3 h-3" />
                        {t('personalTaskLog.recurrence.periodic')}
                    </span>
                )}

                {item.kind === 'linked' && (
                    <span
                        className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-[3px] border"
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

                <span
                    className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-[3px] border ${PERSONAL_TASK_STATUS_BADGE_CLASS[item.status]}`}
                >
                    {severityDotColor && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: severityDotColor }} />}
                    {t(`personalTaskLog.statuses.${item.status}`)}
                </span>

                {start && (
                    <span className="text-xs text-slate-400 dark:text-[var(--figma-ptl-muted)] whitespace-nowrap ms-1">
                        {formatDateTime(start, i18n.language)}
                    </span>
                )}

                <div className="flex items-center gap-0.5 ms-1">
                    <button
                        onClick={onView}
                        className="flex items-center justify-center w-6 h-6 rounded-[3px] text-slate-400 dark:text-zinc-300 hover:text-primary hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                        title={t('personalTaskLog.actions.view')}
                    >
                        <Eye className="w-4 h-4" />
                    </button>
                    <button
                        onClick={onEdit}
                        className="flex items-center justify-center w-6 h-6 rounded-[3px] text-slate-400 dark:text-zinc-300 hover:text-primary hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                        title={t('personalTaskLog.actions.edit')}
                    >
                        <FigmaIcon name="tool-pencil" />
                    </button>
                    <button
                        onClick={onRemove}
                        className="flex items-center justify-center w-6 h-6 rounded-[3px] text-slate-400 dark:text-zinc-300 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                        title={t(item.kind === 'manual' ? 'personalTaskLog.actions.delete' : 'personalTaskLog.actions.unassign')}
                    >
                        {item.kind === 'manual' ? <FigmaIcon name="tool-trash-2" /> : <Unlink className="w-4 h-4" />}
                    </button>
                </div>
            </div>
        </div>
    );
};
