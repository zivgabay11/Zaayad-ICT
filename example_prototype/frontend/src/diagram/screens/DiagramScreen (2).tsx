import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useMapContext } from '../../common/context/MapContext';
import { usePlanContext } from '../../common/context/PlanContext';

const DiagramScreen: React.FC = () => {
    const { t } = useTranslation();
    const { openMap } = useMapContext();
    const { activePlan } = usePlanContext();

    useEffect(() => {
        openMap(100);
    }, [openMap]);

    if (!activePlan) {
        return (
            <div className="w-full h-full flex items-center justify-center text-slate-400 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-slate-200 dark:border-zinc-800">
                <p>{t('diagram.noPlanSelected')}</p>
            </div>
        );
    }

    // The map panel covers this screen fully, so we just render a minimal background
    return (
        <div className="w-full h-full bg-slate-100 dark:bg-zinc-900 rounded-2xl" />
    );
};

export default DiagramScreen;
