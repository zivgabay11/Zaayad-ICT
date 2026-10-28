import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, pointerWithin, useDraggable, useDroppable, useSensor, useSensors } from '@dnd-kit/core';
import { BumDmatz, BumDmatzStatus } from '../../common/utilities/types';
import { DMATZ_STATUS_ORDER, DMATZ_STATUS_STRIPE, DmatzDirection, dmatzDirectionOf, isDmatzReceivedBy } from '../utilities/dmatz';
import { DmatzCard } from './DmatzCard';

// Kanban of the דמ"צים — one droppable column per lifecycle status. Only the unit a דמ"צ was
// raised TO may drag it between columns (it is the one that decides); the unit that raised it
// sees it move.

interface Props {
    dmatzim: BumDmatz[];
    viewingUnitCode: number;
    unitLabelOf: (unitCode: number) => string;
    onOpen: (dmatz: BumDmatz) => void;
    onDelete: (dmatz: BumDmatz) => void;
    onStatusChange: (id: string, status: BumDmatzStatus) => void;
}

const counterpartOf = (d: BumDmatz, viewingUnitCode: number, direction: DmatzDirection) => (direction === 'raised' ? d.toUnitCode : d.fromUnitCode);

const DraggableCard: React.FC<{ dmatz: BumDmatz; props: Omit<Props, 'dmatzim' | 'onStatusChange'> }> = ({ dmatz, props }) => {
    const movable = isDmatzReceivedBy(dmatz, props.viewingUnitCode);
    const direction = dmatzDirectionOf(dmatz, props.viewingUnitCode);
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: dmatz.id, disabled: !movable });
    return (
        <div ref={setNodeRef} {...listeners} {...attributes} className={`touch-none ${isDragging ? 'opacity-30' : ''}`} data-dmatz-id={dmatz.id}>
            <DmatzCard
                dmatz={dmatz}
                direction={direction}
                counterpartLabel={props.unitLabelOf(counterpartOf(dmatz, props.viewingUnitCode, direction))}
                movable={movable}
                deletable={direction === 'raised'}
                onOpen={props.onOpen}
                onDelete={props.onDelete}
            />
        </div>
    );
};

const Column: React.FC<{ status: BumDmatzStatus; dmatzim: BumDmatz[]; props: Omit<Props, 'dmatzim' | 'onStatusChange'> }> = ({ status, dmatzim, props }) => {
    const { t } = useTranslation();
    const { setNodeRef, isOver } = useDroppable({ id: status });
    return (
        <div
            ref={setNodeRef}
            data-dmatz-column={status}
            className={`flex-1 min-w-[220px] flex flex-col rounded-xl border transition-colors ${isOver
                ? 'border-primary bg-primary/10'
                : 'border-slate-200 dark:border-white/10 bg-slate-100/70 dark:bg-white/[0.04]'}`}
        >
            <div className="flex items-center justify-between gap-2 px-3 pt-3 pb-2 shrink-0">
                <h3 className="flex items-center gap-2 text-[17px] font-bold text-slate-900 dark:text-white">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: DMATZ_STATUS_STRIPE[status] }} />
                    {t(`bumManager.dmatz.status.${status}`)}
                </h3>
                <span className="text-[13px] text-slate-500 dark:text-zinc-400">{t('bumManager.dmatz.itemsCount', { count: dmatzim.length })}</span>
            </div>
            <div className="bum-scroll flex-1 min-h-0 overflow-y-auto px-2.5 pb-3 flex flex-col gap-2.5">
                {dmatzim.length === 0 && (
                    <div className="mt-6 text-center text-xs text-slate-400 dark:text-zinc-600">{t('bumManager.dmatz.empty')}</div>
                )}
                {dmatzim.map(d => <DraggableCard key={d.id} dmatz={d} props={props} />)}
            </div>
        </div>
    );
};

export const DmatzBoard: React.FC<Props> = ({ dmatzim, onStatusChange, ...rest }) => {
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
    const [activeId, setActiveId] = useState<string | null>(null);
    const active = dmatzim.find(d => d.id === activeId) ?? null;

    const handleDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));
    const handleDragEnd = (e: DragEndEvent) => {
        setActiveId(null);
        const target = e.over?.id as BumDmatzStatus | undefined;
        const dragged = dmatzim.find(d => d.id === e.active.id);
        if (dragged && target && DMATZ_STATUS_ORDER.includes(target) && target !== dragged.status) onStatusChange(dragged.id, target);
    };

    const activeDirection = active ? dmatzDirectionOf(active, rest.viewingUnitCode) : 'raised';

    return (
        <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={() => setActiveId(null)}>
            <div className="bum-scroll h-full flex gap-3 overflow-x-auto">
                {DMATZ_STATUS_ORDER.map(status => (
                    <Column key={status} status={status} dmatzim={dmatzim.filter(d => d.status === status)} props={rest} />
                ))}
            </div>
            <DragOverlay dropAnimation={null}>
                {active ? (
                    <div className="rotate-1 shadow-2xl">
                        <DmatzCard
                            dmatz={active}
                            direction={activeDirection}
                            counterpartLabel={rest.unitLabelOf(counterpartOf(active, rest.viewingUnitCode, activeDirection))}
                            movable
                            deletable={false}
                            onOpen={() => undefined}
                            onDelete={() => undefined}
                        />
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
};
