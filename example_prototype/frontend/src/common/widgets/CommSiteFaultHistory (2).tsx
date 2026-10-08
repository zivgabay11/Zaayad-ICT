import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useCombatLogContext } from '../context/CombatLogContext';
import { getFaultsForCommSite, isTerminalStatus } from '../utilities/combatLog';
import { CombatLogEvent } from '../utilities/types';

// Integrates the ICT Faults log into a Comm Site's own picture: a fault tagged against a
// site (via CombatLogEvent.relatedCommSiteId, set at creation in the New Event dialog)
// shows up here while open, and automatically "falls into" the site's history the moment
// it's closed — no separate action needed, since it's driven off the same status field
// the Combat Log module already tracks. Shared between the Comm Site table (drawer) and
// the map marker popup so both surfaces stay in sync.

interface CommSiteFaultHistoryProps {
    siteId: string;
    compact?: boolean; // tighter styling for the map popup
}

function FaultRow({ fault, compact }: { fault: CombatLogEvent; compact?: boolean }) {
    const open = !isTerminalStatus('ict_faults', fault.status);
    return (
        <div className={`flex items-center gap-1.5 ${compact ? 'text-[10.5px]' : 'text-xs'} py-1 ${open ? '' : 'opacity-60'}`}>
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${open ? 'bg-red-500' : 'bg-slate-400'}`} />
            <span className={`truncate flex-1 ${open ? 'text-slate-800 dark:text-zinc-100 font-medium' : 'text-slate-500 dark:text-zinc-400'}`}>
                {fault.title}
            </span>
            <span className="text-[10px] text-slate-400 dark:text-zinc-500 shrink-0">{fault.status}</span>
        </div>
    );
}

export const CommSiteFaultHistory: React.FC<CommSiteFaultHistoryProps> = ({ siteId, compact }) => {
    const { t } = useTranslation();
    const { events } = useCombatLogContext();
    const [showHistory, setShowHistory] = useState(false);

    const faults = getFaultsForCommSite(siteId, events);
    if (faults.length === 0) return null;

    const openFaults = faults.filter(f => !isTerminalStatus('ict_faults', f.status));
    const closedFaults = faults.filter(f => isTerminalStatus('ict_faults', f.status));

    return (
        <div className={`mt-2.5 pt-2.5 border-t border-slate-200 dark:border-zinc-700 ${compact ? 'mt-1.5 pt-1.5' : ''}`}>
            <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                    {t('staticSpace.faults.sectionTitle')}
                </span>
                {openFaults.length > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400">
                        {t('staticSpace.faults.openCount', { count: openFaults.length })}
                    </span>
                )}
            </div>

            {openFaults.map(f => <FaultRow key={f.id} fault={f} compact={compact} />)}

            {closedFaults.length > 0 && (
                <>
                    <button
                        onClick={() => setShowHistory(v => !v)}
                        className="flex items-center gap-1 text-[10.5px] font-semibold text-primary hover:underline mt-0.5"
                    >
                        {showHistory ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3 rtl:rotate-180" />}
                        {t('staticSpace.faults.historyToggle', { count: closedFaults.length })}
                    </button>
                    {showHistory && closedFaults.map(f => <FaultRow key={f.id} fault={f} compact={compact} />)}
                </>
            )}
        </div>
    );
};
