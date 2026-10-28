import React from 'react';
import { useTranslation } from 'react-i18next';
import { FigmaIcon } from '../../common/widgets/FigmaIcon';
import { useDashboardsContext } from '../../common/context/DashboardsContext';

// The top-left header button "תצוגות מערכת": opens the user's dashboard repository, from where
// they can open a saved dashboard or build a new one.
export const SystemViewsButton: React.FC = () => {
    const { t } = useTranslation();
    const { openRepository, repositoryOpen } = useDashboardsContext();
    return (
        <button
            onClick={openRepository}
            aria-expanded={repositoryOpen}
            data-system-views-button
            title={t('systemViews.openHint')}
            className="flex items-center gap-1 h-6 px-2 rounded-md bg-slate-100 dark:bg-zinc-700 hover:bg-slate-200 dark:hover:bg-zinc-600 text-xs leading-4 font-semibold text-slate-700 dark:text-white transition-colors"
        >
            <FigmaIcon name="header-modular" width={18} height={16} />
            {t('systemViews.button')}
        </button>
    );
};
