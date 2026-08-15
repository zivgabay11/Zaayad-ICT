import React from 'react';
import { useAnalysisContext, ANALYSIS_TOOL_IDS, AnalysisLegendData } from '../../common/context/AnalysisContext';

const LegendCard: React.FC<{ legend: AnalysisLegendData }> = ({ legend }) => (
    <div className="bg-white/95 dark:bg-zinc-800/95 backdrop-blur-sm rounded-lg shadow-md border border-slate-200 dark:border-zinc-600 p-3 min-w-[140px]">
        <h4 className="text-xs font-semibold text-slate-700 dark:text-zinc-200 mb-2">
            {legend.title}
        </h4>

        {legend.type === 'gradient' ? (
            <div dir="ltr">
                <div
                    className="h-3 rounded-sm w-full mb-1"
                    style={{
                        background: `linear-gradient(to right, ${legend.items.map(i => i.color).join(', ')})`,
                    }}
                />
                <div className="flex justify-between text-[10px] text-slate-500 dark:text-zinc-400">
                    {legend.items.map((item, idx) => (
                        <span key={idx}>{item.label}</span>
                    ))}
                </div>
            </div>
        ) : (
            <div className="flex flex-col gap-1">
                {legend.items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                        <span
                            className="w-3 h-3 rounded-sm shrink-0"
                            style={{ backgroundColor: item.color }}
                        />
                        <span className="text-[11px] text-slate-600 dark:text-zinc-300">
                            {item.label}
                        </span>
                    </div>
                ))}
            </div>
        )}
    </div>
);

export const AnalysisLegend: React.FC = () => {
    const { toolStates } = useAnalysisContext();

    const activeLegends = ANALYSIS_TOOL_IDS
        .filter(id => toolStates[id].status === 'done' && toolStates[id].visible && toolStates[id].legend)
        .map(id => ({ id, legend: toolStates[id].legend! }));

    if (activeLegends.length === 0) return null;

    return (
        <div className="absolute bottom-32 end-4 z-[1000] pointer-events-auto flex flex-col gap-2 max-h-[60%] overflow-y-auto">
            {activeLegends.map(({ id, legend }) => (
                <LegendCard key={id} legend={legend} />
            ))}
        </div>
    );
};
