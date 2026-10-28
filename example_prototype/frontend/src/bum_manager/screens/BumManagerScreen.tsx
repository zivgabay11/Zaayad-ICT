import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Cell } from '../../common/utilities/types';
import { BumSegmented } from '../widgets/BumSegmented';
import { CommanderDemandsScreen } from './CommanderDemandsScreen';
import { DmatzScreen } from './DmatzScreen';
import { InstructionsScreen } from './InstructionsScreen';

// Bum Manager (בו"ם משימות, שליטה וניהול) — split into three sub-sections:
//  • דרישות מפקד  — the commander demands tracker (dashboard / table / kanban / categories),
//                    whose category list can be read by demanding party or by receiving party.
//  • דמ"צים       — equipment & means requests raised to the superior unit (kanban, with files).
//  • הנחיות מפקד  — the instructions commanders pushed down to the field (rows only).

type SectionId = 'demands' | 'dmatz' | 'instructions';
const SECTIONS: SectionId[] = ['demands', 'dmatz', 'instructions'];

interface Props {
    sessionUnitCode?: number;
    sessionCell?: Cell;
}

export const BumManagerScreen: React.FC<Props> = ({ sessionUnitCode = 1000, sessionCell = 'control' }) => {
    const { t } = useTranslation();
    const [section, setSection] = useState<SectionId>('demands');

    return (
        <div className="h-full flex flex-col w-full min-w-0 max-w-full overflow-hidden" data-bum-manager>
            <div className="shrink-0 flex items-center gap-3 px-6 py-2 border-b border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-white/[0.02]">
                <BumSegmented<SectionId>
                    options={SECTIONS.map(key => ({ key, label: t(`bumManager.sections.${key}`) }))}
                    value={section}
                    onChange={setSection}
                    ariaLabel={t('bumManager.title')}
                    testId="bum-sections"
                    size="md"
                />
            </div>
            <div className="flex-1 min-h-0">
                {section === 'demands' && <CommanderDemandsScreen sessionUnitCode={sessionUnitCode} sessionCell={sessionCell} />}
                {section === 'dmatz' && <DmatzScreen sessionUnitCode={sessionUnitCode} />}
                {section === 'instructions' && <InstructionsScreen sessionUnitCode={sessionUnitCode} />}
            </div>
        </div>
    );
};
