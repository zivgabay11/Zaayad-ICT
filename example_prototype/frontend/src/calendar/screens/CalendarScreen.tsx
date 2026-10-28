import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { usePlanContext } from '../../common/context/PlanContext';
import { CalendarEvent } from '../../common/utilities/types';
import { Plus, ChevronRight, ChevronLeft } from 'lucide-react';
import { EventDialog } from '../widgets/EventDialog';

export const CalendarScreen: React.FC = () => {
    const { t, i18n } = useTranslation();
    const { activePlan, updatePlan } = usePlanContext();
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [dialogDefaults, setDialogDefaults] = useState<{ date?: string, level?: string }>({});

    if (!activePlan) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-slate-200 dark:border-zinc-800 p-8 text-center">
                <p className="text-lg">{t('calendar.noPlanSelected')}</p>
            </div>
        );
    }

    const events = activePlan.calendarEvents || [];

    const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
    const [currentDate, setCurrentDate] = useState<Date>(() => {
        if (activePlan.dDay) {
            const baseDate = new Date(activePlan.dDay);

            // Find the earliest startOffsetHours across all phases, default to 0 if no phases
            const firstPhaseOffsetHours = activePlan.phases && activePlan.phases.length > 0
                ? Math.min(...activePlan.phases.map(p => p.startOffsetHours || 0))
                : 0;

            // Apply the offset in hours to the D-Day
            baseDate.setHours(baseDate.getHours() + firstPhaseOffsetHours);

            return baseDate;
        }
        return new Date();
    });

    // Deriving dates for the columns
    const dates = useMemo(() => {
        const result: string[] = [];
        if (viewMode === 'week') {
            // Find Sunday of the current week
            const d = new Date(currentDate);
            const day = d.getDay();
            d.setDate(d.getDate() - day);
            for (let i = 0; i < 7; i++) {
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const dateNum = String(d.getDate()).padStart(2, '0');
                result.push(`${year}-${month}-${dateNum}`);
                d.setDate(d.getDate() + 1);
            }
        } else {
            // Month view: We build a 2D array of weeks consisting of 7 days
            const y = currentDate.getFullYear();
            const m = currentDate.getMonth();

            // Get the first day of the month (0 = Sunday, 1 = Monday, etc.)
            let firstDay = new Date(y, m, 1).getDay();

            // We'll calculate the date of the Sunday before the first of the month
            const d = new Date(y, m, 1);
            d.setDate(d.getDate() - firstDay);

            // Fetch exactly 35 or 42 days (5 or 6 weeks) to complete the grid
            const totalCells = (firstDay >= 5 && new Date(y, m + 1, 0).getDate() === 31) || (firstDay === 6 && new Date(y, m + 1, 0).getDate() >= 30) ? 42 : 35;

            for (let i = 0; i < totalCells; i++) {
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const dateNum = String(d.getDate()).padStart(2, '0');
                result.push(`${year}-${month}-${dateNum}`);
                d.setDate(d.getDate() + 1);
            }
        }
        return result;
    }, [viewMode, currentDate]);

    const handleNextTimeframe = () => {
        const d = new Date(currentDate);
        if (viewMode === 'week') {
            d.setDate(d.getDate() + 7);
        } else {
            d.setDate(1); // avoid end of month skip issues
            d.setMonth(d.getMonth() + 1);
        }
        setCurrentDate(d);
    };

    const handlePrevTimeframe = () => {
        const d = new Date(currentDate);
        if (viewMode === 'week') {
            d.setDate(d.getDate() - 7);
        } else {
            d.setDate(1);
            d.setMonth(d.getMonth() - 1);
        }
        setCurrentDate(d);
    };

    const levels = ['command', 'division', 'brigade'];

    const getLevelRowName = (level: string) => t(`calendar.levels.${level}`);

    const handleCellClick = (date: string, level: string) => {
        setDialogDefaults({ date, level });
        setSelectedEvent(null);
        setIsDialogOpen(true);
    };

    const handleEventClick = (e: React.MouseEvent, event: CalendarEvent) => {
        e.stopPropagation();
        setSelectedEvent(event);
        setIsDialogOpen(true);
    };

    const handleSaveEvent = (savedEvent: CalendarEvent) => {
        let newEvents = [...events];
        const existingIndex = newEvents.findIndex(e => e.id === savedEvent.id);
        if (existingIndex >= 0) {
            newEvents[existingIndex] = savedEvent;
        } else {
            newEvents.push(savedEvent);
        }
        updatePlan(activePlan.id, { calendarEvents: newEvents });
    };

    const handleDeleteEvent = (id: string) => {
        const newEvents = events.filter(e => e.id !== id);
        updatePlan(activePlan.id, { calendarEvents: newEvents });
    };

    const handleDragStart = (e: React.DragEvent, event: CalendarEvent) => {
        e.dataTransfer.setData('text/plain', event.id);
        e.dataTransfer.effectAllowed = 'move';
        // Add a slight transparency effect to the dragged element
        setTimeout(() => {
            (e.target as HTMLElement).style.opacity = '0.5';
        }, 0);
    };

    const handleDragEnd = (e: React.DragEvent) => {
        (e.target as HTMLElement).style.opacity = '1';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent, targetDate: string, targetLevel?: string) => {
        e.preventDefault();
        const eventId = e.dataTransfer.getData('text/plain');
        if (!eventId) return;

        const eventIndex = events.findIndex(evt => evt.id === eventId);
        if (eventIndex >= 0) {
            const draggedEvent = events[eventIndex];
            const newEvents = [...events];
            newEvents[eventIndex] = {
                ...draggedEvent,
                date: targetDate,
                // In month view, we might drop on a cell without changing the level, so fallback to current
                level: targetLevel || draggedEvent.level
            };
            updatePlan(activePlan.id, { calendarEvents: newEvents });
        }
    };

    const getEventStyle = (level: string) => {
        switch (level) {
            case 'command': return 'bg-purple-100 dark:bg-purple-900/40 text-purple-900 dark:text-purple-100 border-purple-200 dark:border-purple-800';
            case 'division': return 'bg-blue-100 dark:bg-blue-900/40 text-blue-900 dark:text-blue-100 border-blue-200 dark:border-blue-800';
            case 'brigade': return 'bg-slate-200 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 border-slate-300 dark:border-zinc-700';
            default: return 'bg-gray-100 dark:bg-gray-800';
        }
    };

    // Format date string to display Day and Date
    const formatHeaderDate = (dateStr: string) => {
        const d = new Date(dateStr);
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const dayName = t(`calendar.days.${dayNames[d.getDay()]}`);
        const formattedDate = `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
        return { dayName, formattedDate };
    };

    return (
        <div className="w-full h-full flex flex-col bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-slate-200 dark:border-zinc-800 overflow-hidden">
            {/* Header / Actions */}
            <div className="p-4 border-b border-slate-200 dark:border-zinc-800 flex justify-between items-center bg-slate-50 dark:bg-zinc-900/50">
                <div className="flex gap-4 items-center">
                    <h1 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-4">
                        {t('nav.calendar')}
                    </h1>
                    <div className="flex items-center gap-1 mx-2 bg-white dark:bg-zinc-800 p-1 rounded-lg border border-slate-200 dark:border-zinc-700 shadow-sm">
                        <button onClick={handlePrevTimeframe} className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-700 rounded text-slate-600 dark:text-zinc-300">
                            <ChevronLeft size={18} className="rtl:rotate-180" />
                        </button>
                        <input
                            type="date"
                            value={`${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`}
                            onChange={(e) => {
                                if (e.target.value) {
                                    setCurrentDate(new Date(e.target.value));
                                }
                            }}
                            className="bg-transparent text-sm font-medium px-2 min-w-[120px] text-center text-slate-800 dark:text-zinc-200 outline-none cursor-pointer hover:text-primary transition-colors"
                        />
                        <button onClick={handleNextTimeframe} className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-700 rounded text-slate-600 dark:text-zinc-300">
                            <ChevronRight size={18} className="rtl:rotate-180" />
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex bg-slate-200 dark:bg-zinc-800 p-1 rounded-lg">
                        <button
                            onClick={() => setViewMode('week')}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === 'week' ? 'bg-white dark:bg-zinc-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'}`}
                        >
                            {t('calendar.weeklyView')}
                        </button>
                        <button
                            onClick={() => setViewMode('month')}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === 'month' ? 'bg-white dark:bg-zinc-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'}`}
                        >
                            {t('calendar.monthlyView')}
                        </button>
                    </div>

                    <button
                        onClick={() => {
                            setDialogDefaults({});
                            setSelectedEvent(null);
                            setIsDialogOpen(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-primary hover:opacity-90 text-white rounded-lg transition-colors text-sm font-medium"
                    >
                        <Plus size={16} />
                        {t('calendar.addEvent')}
                    </button>
                </div>
            </div>

            {/* Grid Container */}
            <div className="flex-1 overflow-auto bg-slate-50 dark:bg-zinc-900 p-4 text-sm rtl:text-right">
                {viewMode === 'week' ? (
                    <div
                        className="border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-900 min-w-max"
                        style={{
                            display: 'grid',
                            gridTemplateColumns: `150px repeat(7, minmax(180px, 1fr))`
                        }}
                    >
                        {/* Header Row */}
                        <div className="border-b border-e border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/50 p-4 font-semibold text-slate-700 dark:text-zinc-300">
                            {/* Empty Top-Left Cell */}
                        </div>
                        {dates.map((date, idx) => {
                            const { dayName, formattedDate } = formatHeaderDate(date);
                            return (
                                <div key={`header-${date}`} className="border-b border-e last:border-e-0 border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/50 py-4 px-6 text-center rtl:border-l rtl:border-r-0 rtl:last:border-l-0">
                                    <div className="font-bold text-slate-800 dark:text-white mb-1 leading-tight">{dayName}</div>
                                    <div className="text-slate-500 dark:text-zinc-400 font-medium">{formattedDate}</div>
                                </div>
                            );
                        })}

                        {/* Rows */}
                        {levels.map((level) => (
                            <React.Fragment key={`row-${level}`}>
                                {/* Level Header Column */}
                                <div className="border-b last:border-b-0 border-e border-slate-200 dark:border-zinc-800 p-4 flex items-center justify-center text-center font-bold text-slate-700 dark:text-zinc-200 rtl:border-l rtl:border-r-0">
                                    {getLevelRowName(level)}
                                </div>

                                {/* Date Cells for Level */}
                                {dates.map((date) => {
                                    const cellEvents = events.filter(e => e.date === date && e.level === level);

                                    return (
                                        <div
                                            key={`cell-${level}-${date}`}
                                            onClick={() => handleCellClick(date, level)}
                                            onDragOver={handleDragOver}
                                            onDrop={(e) => handleDrop(e, date, level)}
                                            className="border-b last:border-b-0 border-e last:border-e-0 border-slate-200 dark:border-zinc-800 p-2 min-h-[140px] hover:bg-slate-50/50 dark:hover:bg-zinc-800/30 cursor-pointer rtl:border-l rtl:border-r-0 rtl:last:border-l-0 transition-colors flex flex-col gap-2"
                                        >
                                            {cellEvents.map(evt => (
                                                <div
                                                    key={evt.id}
                                                    draggable
                                                    onDragStart={(e) => handleDragStart(e, evt)}
                                                    onDragEnd={handleDragEnd}
                                                    onClick={(e) => handleEventClick(e, evt)}
                                                    className={`p-3 rounded-lg border transition-transform hover:scale-[1.02] cursor-move shadow-sm flex flex-col items-center justify-center text-center ${getEventStyle(level)}`}
                                                >
                                                    <div className="font-bold mb-1 leading-tight">{evt.title?.[i18n.language] || evt.title?.['en']}</div>
                                                    <div className="text-xs opacity-90 flex items-center justify-center gap-1 flex-wrap">
                                                        {evt.location && <span>{evt.location}</span>}
                                                        {evt.location && evt.time && <span>|</span>}
                                                        {evt.time && <span dir="ltr">{evt.time}</span>}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })}
                            </React.Fragment>
                        ))}
                    </div>
                ) : (
                    <div className="h-full border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-900 flex flex-col min-w-max">
                        <div className="grid grid-cols-7 border-b border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/50">
                            {['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].map(day => (
                                <div key={day} className="border-e last:border-e-0 border-slate-200 dark:border-zinc-800 py-3 px-4 text-center font-bold text-slate-700 dark:text-zinc-300 rtl:border-l rtl:border-r-0 rtl:last:border-l-0">
                                    {t(`calendar.days.${day}`)}
                                </div>
                            ))}
                        </div>
                        <div
                            className="flex-1 grid grid-cols-7"
                            style={{ gridTemplateRows: `repeat(${dates.length / 7}, minmax(120px, 1fr))` }}
                        >
                            {dates.map((date, idx) => {
                                const dateObj = new Date(date);
                                const isCurrentMonth = dateObj.getMonth() === currentDate.getMonth();
                                const todayStr = new Date().toISOString().split('T')[0];
                                const isToday = date === todayStr;
                                const dayNum = dateObj.getDate();
                                const cellEvents = events.filter(e => e.date === date);

                                return (
                                    <div
                                        key={`month-cell-${date}`}
                                        onClick={() => handleCellClick(date, 'command')}
                                        onDragOver={handleDragOver}
                                        onDrop={(e) => handleDrop(e, date)}
                                        className={`border-b border-e border-slate-200 dark:border-zinc-800 p-2 rtl:border-l rtl:border-r-0 hover:bg-slate-50/50 dark:hover:bg-zinc-800/30 cursor-pointer overflow-hidden flex flex-col gap-1 transition-colors ${!isCurrentMonth ? 'bg-slate-50/50 dark:bg-zinc-900/50 opacity-70' : ''}`}
                                    >
                                        <div className="flex justify-between items-center mb-1">
                                            <span className={`text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-primary text-white' : 'text-slate-700 dark:text-zinc-300'}`}>
                                                {dayNum}
                                            </span>
                                        </div>
                                        <div className="flex-1 overflow-y-auto space-y-1 pe-1">
                                            {cellEvents.map(evt => (
                                                <div
                                                    key={evt.id}
                                                    draggable
                                                    onDragStart={(e) => handleDragStart(e, evt)}
                                                    onDragEnd={handleDragEnd}
                                                    onClick={(e) => handleEventClick(e, evt)}
                                                    className={`px-2 py-1 text-xs truncate rounded border cursor-move hover:opacity-80 transition-opacity ${getEventStyle(evt.level)}`}
                                                >
                                                    <span className="font-semibold me-1">{evt.time}</span>
                                                    {evt.title?.[i18n.language] || evt.title?.['en']}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            <EventDialog
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                onSave={handleSaveEvent}
                onDelete={handleDeleteEvent}
                initialEvent={selectedEvent}
                defaultDate={dialogDefaults.date}
                defaultLevel={dialogDefaults.level}
            />
        </div>
    );
};