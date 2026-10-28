import React from 'react';
import { useTranslation } from 'react-i18next';
import { MousePointerClick, X } from 'lucide-react';
import { HeadquartersMapRequest } from '../../common/context/HeadquartersMapRequestContext';
import { useLinkPlanningContext } from '../../common/context/LinkPlanningContext';
import { mockUnits } from '../../common/utilities/mockData';
import { formatUnitName } from '../../common/utilities/formatting';

// Floating instruction shown over the map while it's collecting a position on behalf of the
// "מפקדות וחפ"קים" overview (add a headquarters/command post to a unit, or move one). Esc or
// the cancel button abandons the request and returns to the overview.

interface Props {
    request: HeadquartersMapRequest;
    onCancel: () => void;
}

export const HeadquartersMapRequestBanner: React.FC<Props> = ({ request, onCancel }) => {
    const { t, i18n } = useTranslation();
    const { headquartersEntities } = useLinkPlanningContext();

    let message: string;
    if (request.type === 'add') {
        const unit = mockUnits.find(u => u.code === request.unitCode);
        message = t(request.kind === 'headquarters' ? 'headquartersOverview.map.placeHeadquarters' : 'headquartersOverview.map.placeCommandPost', {
            unit: unit ? formatUnitName(unit as any, t, i18n.language) : request.unitCode,
        });
    } else {
        const entity = headquartersEntities.find(e => e.id === request.entityId);
        message = t('headquartersOverview.map.moveEntity', { name: entity?.name ?? '' });
    }

    return (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[1900] flex items-center gap-3 bg-slate-900/95 dark:bg-zinc-800/95 text-white rounded-xl shadow-xl border border-white/10 ps-4 pe-2 py-2 animate-in fade-in slide-in-from-top-2 duration-200">
            <MousePointerClick className="w-4 h-4 shrink-0 text-sky-300" />
            <span className="text-sm font-medium">{message}</span>
            <button
                onClick={onCancel}
                className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors font-medium"
            >
                <X className="w-3.5 h-3.5" /> {t('headquartersOverview.map.cancel')}
            </button>
        </div>
    );
};
