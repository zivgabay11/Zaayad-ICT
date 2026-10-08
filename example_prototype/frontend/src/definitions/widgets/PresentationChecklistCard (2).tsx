import React from 'react';
import { useTranslation } from 'react-i18next';
import { Plan } from '../../common/utilities/types';
import { CheckSquare, Square } from 'lucide-react';

interface Props {
    plan: Plan;
    onUpdate: (changes: Partial<Plan>) => void;
}

export const PresentationChecklistCard: React.FC<Props> = ({ plan, onUpdate }) => {
    const { t } = useTranslation();

    const items = [
        'intelligence',
        'objectiveMission',
        'phasesForcesGantt',
        'schematicChart',
        'attackTasks',
        'fireAllocations',
        'targetsSequence',
        'artillerySupport',
        'supportMatrix',
        'rangesJumps',
        'communications'
    ];

    const currentItems = plan.presentationItems || [];

    const toggleItem = (itemId: string) => {
        if (currentItems.includes(itemId)) {
            onUpdate({ presentationItems: currentItems.filter(i => i !== itemId) });
        } else {
            onUpdate({ presentationItems: [...currentItems, itemId] });
        }
    };

    return (
        <div className="flex flex-col gap-1.5 h-full">
            <p className="text-xs text-slate-500 dark:text-zinc-400 mb-3 ml-1 px-1">{t('definitions.checklistDescription')}</p>
            {items.map(item => {
                const isChecked = currentItems.includes(item);
                return (
                    <div
                        key={item}
                        onClick={() => toggleItem(item)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-zinc-800/60 cursor-pointer transition-colors group"
                    >
                        <div className="flex flex-col border border-transparent items-center justify-center shrink-0">
                            {isChecked ? (
                                <CheckSquare className="w-5 h-5 text-green-500" />
                            ) : (
                                <Square className="w-5 h-5 text-slate-300 dark:text-zinc-600 group-hover:text-green-400 transition-colors" />
                            )}
                        </div>
                        <span className="text-[13px] font-medium tracking-wide text-slate-700 dark:text-zinc-300 select-none">
                            {t(`definitions.checklistItems.${item}`)}
                        </span>
                    </div>
                );
            })}
        </div>
    );
};