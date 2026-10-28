import React from 'react';
import { Cell, DashboardFeatureId } from '../../common/utilities/types';
import { CombatLogScreen } from '../../combat_log/screens/CombatLogScreen';
import { CombatScriptScreen } from '../../combat_script/screens/CombatScriptScreen';
import { PersonalTaskLogScreen } from '../../personal_task_log/screens/PersonalTaskLogScreen';
import { BumManagerScreen } from '../../bum_manager/screens/BumManagerScreen';
import { HeadquartersOverviewScreen } from '../../headquarters_overview/screens/HeadquartersOverviewScreen';
import { StaticSpaceScreen } from '../../static_space/screens/StaticSpaceScreen';
import { TikshovCopScreen } from '../../tikshov_cop/screens/TikshovCopScreen';
import { SpectrumScreen } from '../../spectrum/screens/SpectrumScreen';

// The live content of one dashboard widget: the real screen of the feature it stands for,
// with the same session props the app's own routing passes it. Everything stays functional
// inside the widget (filters, tabs, add/edit dialogs…) because it is the same component.

interface Props {
    featureId: DashboardFeatureId;
    sessionUnitCode?: number;
    sessionCell?: Cell;
}

export const DashboardFeatureContent: React.FC<Props> = ({ featureId, sessionUnitCode, sessionCell }) => {
    switch (featureId) {
        case 'combat_log': return <CombatLogScreen />;
        case 'combat_script': return <CombatScriptScreen sessionUnitCode={sessionUnitCode} />;
        case 'personal_task_log': return <PersonalTaskLogScreen />;
        case 'bum_manager': return <BumManagerScreen sessionUnitCode={sessionUnitCode} sessionCell={sessionCell} />;
        case 'headquarters_overview': return <HeadquartersOverviewScreen sessionUnitCode={sessionUnitCode} />;
        case 'static_space': return <StaticSpaceScreen />;
        case 'tikshov_cop': return <TikshovCopScreen />;
        case 'spectrum_jamming': return <SpectrumScreen tab="jamming" />;
        case 'spectrum_blocking': return <SpectrumScreen tab="blocking" />;
        default: return null;
    }
};
