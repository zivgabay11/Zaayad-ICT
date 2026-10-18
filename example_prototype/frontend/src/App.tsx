import React, { useState, useEffect } from 'react';
import {
    ClipboardList, RefreshCw, Eraser, HelpCircle, Settings, Palette, LogOut,
    Map, Calendar as CalendarIcon, Target, CheckSquare, Crosshair, Flag, Globe, Lightbulb,
    SlidersHorizontal, TriangleAlert, X, PenTool, Sparkles, ScrollText, Swords,
    ChevronDown, ChevronUp, LayoutGrid, Grid3x3, Home, Library, Shield, Radio, Waves, Eye,
    RadioTower, Radar, Ban, ListChecks
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { NavItem } from './common/widgets/NavItem';
import { LoginScreen } from './auth/screens/LoginScreen';
import { DefinitionsScreen } from './definitions/screens/DefinitionsScreen';
import { ChatPanel } from './common/chat/widgets/ChatPanel';
import { usePlanContext } from './common/context/PlanContext';
import { useTranslation } from 'react-i18next';
import { Session, UserRole } from './common/utilities/types';
import { mockUsers, mockUnits } from './common/utilities/mockData';
import { ALL_ROLES, getRoleShortLabel } from './common/utilities/roles';

import { PlansScreen } from './plans/screens/PlansScreen';
import { CalendarScreen } from './calendar/screens/CalendarScreen';
import GeneralScreen from './general/screens/GeneralScreen';
import IntelligenceScreen from './intelligence/screens/IntelligenceScreen';
import ObjectiveScreen from './objective/screens/ObjectiveScreen'; import MissionScreen from './mission/screens/MissionScreen'; import MethodScreen from './method/screens/MethodScreen'; import { TasksScreen } from './tasks/screens/TasksScreen';
import { CombatScriptScreen } from './combat_script/screens/CombatScriptScreen';
import { MapProvider, useMapContext } from './common/context/MapContext';
import { DocProvider } from './common/context/DocContext';
import { AnalysisProvider } from './common/context/AnalysisContext';
import { StaticSpaceProvider } from './common/context/StaticSpaceContext';
import { TikshovProvider } from './common/context/TikshovContext';
import { SpectrumProvider } from './common/context/SpectrumContext';
import { TikshovCopScreen } from './tikshov_cop/screens/TikshovCopScreen';
import { CombatLogProvider } from './common/context/CombatLogContext';
import { CombatLogScreen } from './combat_log/screens/CombatLogScreen';
import { PersonalTaskLogProvider } from './common/context/PersonalTaskLogContext';
import { PersonalTaskLogScreen } from './personal_task_log/screens/PersonalTaskLogScreen';
import { MapPanel } from './common/widgets/MapPanel';
import { MapEdgeHandle } from './common/widgets/MapEdgeHandle';
import { DocPanel } from './common/widgets/DocPanel';
import { DocEdgeHandle } from './common/widgets/DocEdgeHandle';
import { AddCommSitesModal } from './common/widgets/AddCommSitesModal';
import { CommSiteDetailPage } from './common/widgets/CommSiteDetailPage';
import { StaticSpaceScreen } from './static_space/screens/StaticSpaceScreen';
import { SpectrumScreen } from './spectrum/screens/SpectrumScreen';
import { formatUnitName } from './common/utilities/formatting';

const CHAT_HIDE_THRESHOLD = 30; // Hide chat when map width >= 30%

interface ContentAreaProps {
    currentSection: string;
    chatKey: number;
    activePlan: any;
    setCurrentSection: (section: any) => void;
    session: Session | null;
}

const ContentArea: React.FC<ContentAreaProps> = ({ currentSection, chatKey, activePlan, setCurrentSection, session }) => {
    const { isMapOpen, mapWidth } = useMapContext();
    return (
        <div className={`flex overflow-hidden transition-all duration-300 ${isMapOpen && mapWidth === 100 ? 'p-0 gap-0 flex-none w-0' : 'flex-1 p-5 gap-5'}`}>
            <ChatSection
                chatKey={chatKey}
                activePlan={activePlan}
                currentSection={currentSection}
                onNavigate={(section) => setCurrentSection(section)}
            />

            {!['diagram', 'main'].includes(currentSection) && (
                <div className="flex-1 min-w-[400px] overflow-hidden rounded-2xl">
                    {currentSection === 'plans' ? (
                        <PlansScreen session={session!} onNavigate={(section) => setCurrentSection(section)} />
                    ) : currentSection === 'definitions' ? (
                        <DefinitionsScreen />
                    ) : currentSection === 'calendar' ? (
                        <CalendarScreen />
                    ) : currentSection === 'general' ? (
                        <GeneralScreen />
                    ) : currentSection === 'intelligence' ? (
                        <IntelligenceScreen />
                    ) : currentSection === 'objective' ? (
                        <ObjectiveScreen />
                    ) : currentSection === 'mission' ? (
                        <MissionScreen />
                    ) : currentSection === 'method' ? (
                        <MethodScreen />
                    ) : currentSection === 'tasks' ? (
                        <TasksScreen />
                    ) : currentSection === 'combat_script' ? (
                        <CombatScriptScreen sessionUnitCode={session?.unit?.code} />
                    ) : currentSection === 'tikshov_cop' ? (
                        <TikshovCopScreen />
                    ) : currentSection === 'static_space' ? (
                        <StaticSpaceScreen />
                    ) : currentSection === 'spectrum_jamming' ? (
                        <SpectrumScreen tab="jamming" />
                    ) : currentSection === 'spectrum_blocking' ? (
                        <SpectrumScreen tab="blocking" />
                    ) : currentSection === 'telecom_journal' ? (
                        <CombatLogScreen />
                    ) : currentSection === 'personal_task_log' ? (
                        <PersonalTaskLogScreen />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-slate-200 dark:border-zinc-800">
                            {(currentSection as string).charAt(0).toUpperCase() + (currentSection as string).slice(1).replace('-', ' ')}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
interface ChatSectionProps {
    chatKey: number;
    activePlan: any;
    currentSection: string;
    onNavigate: (section: string) => void;
}

const ChatSection: React.FC<ChatSectionProps> = ({ chatKey, activePlan, currentSection, onNavigate }) => {
    const { isMapOpen, mapWidth, setMapWidth } = useMapContext();
    const [isChatManuallyHidden, setIsChatManuallyHidden] = useState(() => {
        const stored = localStorage.getItem('horus_chat_hidden');
        return stored !== null ? stored === 'true' : true;
    });

    useEffect(() => {
        if (isChatManuallyHidden) {
            localStorage.setItem('horus_chat_hidden', 'true');
        } else {
            localStorage.removeItem('horus_chat_hidden');
        }
    }, [isChatManuallyHidden]);

    // On diagram screen, chat hides at a higher threshold (since there's no content panel)
    const DIAGRAM_CHAT_HIDE_THRESHOLD = 85;
    const isChatHidden = isChatManuallyHidden || (isMapOpen && mapWidth >= (['diagram', 'main'].includes(currentSection) ? DIAGRAM_CHAT_HIDE_THRESHOLD : CHAT_HIDE_THRESHOLD));

    const handleShowChat = () => {
        setIsChatManuallyHidden(false);
        if (['diagram', 'main'].includes(currentSection)) {
            setMapWidth(70);
        } else if (isMapOpen && mapWidth >= CHAT_HIDE_THRESHOLD) {
            setMapWidth(CHAT_HIDE_THRESHOLD - 5);
        }
    };

    const handleHideChat = () => {
        setIsChatManuallyHidden(true);
        if (['diagram', 'main'].includes(currentSection)) {
            setMapWidth(100);
        }
    };

    useEffect(() => {
        const handleToggleEvent = () => {
            if (isChatHidden) {
                handleShowChat();
            } else {
                handleHideChat();
            }
        };
        const handleShowEvent = () => {
            if (isChatHidden) {
                handleShowChat();
            }
        };
        window.addEventListener('horus-toggle-chat', handleToggleEvent);
        window.addEventListener('horus-show-chat', handleShowEvent);
        return () => {
            window.removeEventListener('horus-toggle-chat', handleToggleEvent);
            window.removeEventListener('horus-show-chat', handleShowEvent);
        };
    }, [isChatHidden, currentSection, isMapOpen, mapWidth]); // Dependencies needed because handleShowChat/handleHideChat use them

    return (
        <div className="shrink-0 h-full hidden lg:flex flex-col items-end relative">
            {/* Animated chat panel wrapper - always mounted to preserve session */}
            <motion.div
                animate={{ width: isChatHidden ? 0 : 320 }}
                transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                className="h-full overflow-hidden"
            >
                <div className="w-80 h-full">
                    <ChatPanel key={chatKey} activePlan={activePlan} currentSection={currentSection} onNavigate={onNavigate} onHide={handleHideChat} />
                </div>
            </motion.div>
        </div>
    );
};

export default function App() {
    const { activePlan, resetData } = usePlanContext();
    const { t, i18n } = useTranslation();
    // Short labels for the header's role switcher — getRoleShortLabel is the single shared
    // source every other role picker in the app (Combat Log's assign-to-cell UI, Personal
    // Task Log badges) must also call, so they stay byte-identical to this dropdown.
    const roleShortLabels: Record<UserRole, string> = Object.fromEntries(
        ALL_ROLES.map(role => [role, getRoleShortLabel(t, role)])
    ) as Record<UserRole, string>;
    // Splash + login are disabled for this build: it opens straight to the main map
    // screen with the Static Space Establishment feature, no auth step in the way.
    const [showSplash, setShowSplash] = useState(false);
    const [splashOpacity, setSplashOpacity] = useState(1);
    const [chatKey, setChatKey] = useState(0);
    const [session, setSession] = useState<Session | null>(() => {
        const stored = localStorage.getItem('session');
        if (stored) return JSON.parse(stored);
        const defaultSession: Session = { user: mockUsers[0], unit: mockUnits[1], role: 'operationsOfficer' };
        localStorage.setItem('session', JSON.stringify(defaultSession));
        return defaultSession;
    });
    const isAuthenticated = !!session;
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);

    useEffect(() => {
        const fadeTimer = setTimeout(() => {
            setSplashOpacity(0);
        }, 2000);

        const removeTimer = setTimeout(() => {
            setShowSplash(false);
        }, 2500);

        return () => {
            clearTimeout(fadeTimer);
            clearTimeout(removeTimer);
        };
    }, []);

    useEffect(() => {
        document.documentElement.dir = i18n.language === 'he' ? 'rtl' : 'ltr';
        document.documentElement.lang = i18n.language;
    }, [i18n.language]);

    const [isDarkMode, setIsDarkMode] = useState(() => {
        const savedTheme = localStorage.getItem('isDarkMode');
        return savedTheme !== null ? savedTheme === 'true' : true;
    });
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
    const [isSidebarVisible, setIsSidebarVisible] = useState(true);
    // Which of the five expandable categories (Planning / Control / Monitoring /
    // Spectrum / Management) has its side panel open — null when none does. Exactly one at
    // a time: opening one closes any other, same as switching between them directly.
    const [openPanel, setOpenPanel] = useState<'planning' | 'control' | 'monitoring' | 'spectrum' | 'management' | null>(null);
    const closePanel = () => setOpenPanel(null);
    const [currentSection, setCurrentSection] = useState<'main' | 'plans' | 'definitions' | 'calendar' | 'general' | 'intelligence' | 'objective' | 'mission' | 'tasks' | 'method' | 'diagram' | 'combat_script' | 'telecom_journal' | 'telecom_deployment' | 'personal_task_log' | 'tikshov_cop' | 'static_space' | 'radio' | 'spectrum_jamming' | 'spectrum_blocking' | 'sync_efforts' | 'order'>('main');

    // Group of sections that belong to "תכנון" (Planning)
    const orderSections = ['general', 'intelligence', 'objective', 'mission', 'method', 'tasks', 'diagram', 'calendar'];
    const isOrderSectionActive = orderSections.includes(currentSection);

    // Group of sections that belong to "שליטה וניהול" (Command & Control)
    const controlSections = ['telecom_journal', 'combat_script', 'personal_task_log'];
    const isControlSectionActive = controlSections.includes(currentSection);

    // Group of sections that belong to "ניטור" (Monitoring)
    const monitoringSections = ['tikshov_cop', 'static_space'];
    const isMonitoringSectionActive = monitoringSections.includes(currentSection);

    // Group of sections that belong to "ספקטרום" (Spectrum)
    const spectrumSections = ['spectrum_jamming', 'spectrum_blocking'];
    const isSpectrumSectionActive = spectrumSections.includes(currentSection);

    // Group of sections that belong to "ניהול" (Management)
    const managementSections = ['sync_efforts', 'order', 'definitions', 'plans'];
    const isManagementSectionActive = managementSections.includes(currentSection);

    const toggleTheme = () => {
        setIsDarkMode((prev) => {
            const newValue = !prev;
            localStorage.setItem('isDarkMode', String(newValue));
            return newValue;
        });
    };

    const handleResetChat = () => {
        setChatKey(prev => prev + 1);
    };

    const handleResetDataClick = () => {
        setIsResetModalOpen(true);
    };

    const confirmResetData = () => {
        resetData();
        setIsResetModalOpen(false);
    };

    const handleLogin = (newSession: Session) => {
        localStorage.setItem('session', JSON.stringify(newSession));
        setSession(newSession);
    };

    const handleSignOut = () => {
        localStorage.removeItem('session');
        setSession(null);
    };

    const handleRoleChange = (role: UserRole) => {
        setSession(prev => {
            if (!prev) return prev;
            const updated = { ...prev, role };
            localStorage.setItem('session', JSON.stringify(updated));
            return updated;
        });
        setIsRoleDropdownOpen(false);
    };

    if (!isAuthenticated && !showSplash) {
        return <LoginScreen onLogin={handleLogin} isDarkMode={isDarkMode} />;
    }

    return (
        <div className={`flex flex-col h-screen w-full font-sans overflow-hidden transition-colors duration-200 ${isDarkMode ? 'dark bg-zinc-900 text-zinc-100' : 'bg-white text-zinc-800'}`}>
            {showSplash && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-white dark:bg-zinc-900 transition-opacity duration-500 ease-in-out"
                    style={{ opacity: splashOpacity }}
                >
                    <div className="flex flex-col items-center justify-center space-y-4 animate-in fade-in zoom-in duration-500">
                        <img
                            src={isDarkMode ? "/horus_ecosystem_symbol.png" : "/horus_ecosystem_symbol.png"}
                            alt="Horus Prototype"
                            className="h-24 object-contain"
                        />
                        <span className="text-xl font-medium tracking-widest text-zinc-500 dark:text-zinc-400 uppercase">
                            Prototype
                        </span>
                    </div>
                </div>
            )}
            {!showSplash && (
                <StaticSpaceProvider>
                <TikshovProvider>
                <SpectrumProvider>
                <CombatLogProvider>
                <PersonalTaskLogProvider>
                    {/* Top Header */}
                    <header className="flex items-center justify-between px-2 py-2 bg-white dark:bg-zinc-950 border-b border-slate-200 dark:border-zinc-800 z-20 transition-colors duration-200 relative">
                        {/* End section (right in RTL): Toggle sidebar + Operations dropdown + placeholder icons */}
                        <div className="flex items-center gap-2">
                            {/* Toggle Main Sidebar */}
                            <button
                                className="flex items-center gap-1.5 p-1 h-9 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors"
                                onClick={() => setIsSidebarVisible(prev => !prev)}
                                title={t('nav.collapse_sidebar')}
                            >
                                <div className="flex items-center justify-center w-7 h-7 rounded-md bg-white dark:bg-zinc-700 shadow-sm border border-slate-200 dark:border-zinc-600 text-slate-600 dark:text-zinc-200">
                                    <span className="material-symbols-outlined text-[18px] leading-none">arrow_menu_close</span>
                                </div>
                                <ChevronDown className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400 me-0.5" />
                            </button>

                            {/* Role dropdown — switches session.role between the unit's three role types */}
                            <div className="relative">
                                <button
                                    onClick={() => setIsRoleDropdownOpen(prev => !prev)}
                                    className="flex items-center gap-2 p-1 ps-2 h-9 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                                >
                                    <div className="flex items-center justify-center w-7 h-7 rounded-md bg-white dark:bg-zinc-700 shadow-sm border border-slate-200 dark:border-zinc-600">
                                        <img src="/icon_agam.svg" alt="" className="w-4 h-4 object-contain brightness-0 dark:brightness-200" />
                                    </div>
                                    <span className="text-sm font-medium text-slate-700 dark:text-zinc-200">
                                        {session ? roleShortLabels[session.role] : ''}
                                    </span>
                                    <ChevronDown className={`w-3.5 h-3.5 text-slate-500 dark:text-zinc-400 transition-transform ${isRoleDropdownOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {isRoleDropdownOpen && (
                                    <div className="absolute top-full start-0 mt-1.5 bg-white dark:bg-zinc-800 rounded-lg shadow-lg border border-slate-200 dark:border-zinc-600 py-1 min-w-[140px] z-30">
                                        {ALL_ROLES.map((role) => (
                                            <button
                                                key={role}
                                                onClick={() => handleRoleChange(role)}
                                                className={`w-full text-start px-3 py-1.5 text-sm transition-colors ${session?.role === role ? 'bg-primary/10 text-primary font-medium' : 'text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-700'}`}
                                            >
                                                {roleShortLabels[role]}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Placeholder view-mode icons */}
                            <button className="flex items-center justify-center p-1.5 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-default" tabIndex={-1}>
                                <span className="material-symbols-outlined text-[20px] leading-none text-slate-400 dark:text-zinc-500">space_dashboard</span>
                            </button>
                            <button className="flex items-center justify-center p-1.5 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-default" tabIndex={-1}>
                                <span className="material-symbols-outlined text-[20px] leading-none text-slate-400 dark:text-zinc-500">apps</span>
                            </button>
                        </div>

                        {/* Center section: plan info + ecosystem symbol + session info */}
                        <div className="invisible h-9 w-0"></div>
                        <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center pointer-events-none z-30">
                            <div className="flex items-stretch pointer-events-auto bg-slate-100 dark:bg-[#303134] rounded-lg shadow-sm border border-slate-300 dark:border-zinc-700/70 h-9">

                                {/* Start block: Operational Reality & Role */}
                                <div className="flex flex-col items-center justify-center px-4 min-w-[140px]">
                                    <span className="text-[13px] font-bold text-slate-800 dark:text-white leading-none mb-0.5">
                                        {t('header.operational_reality', 'מציאות מבצעית')}
                                    </span>
                                    <span className="text-[11px] text-slate-500 dark:text-slate-300 leading-none">
                                        {session ? t(`roles.${session.role}`) : ''}
                                    </span>
                                </div>

                                {/* Shield Symbol */}
                                <div className="z-10 -mx-1 flex items-center justify-center drop-shadow-md">
                                    <img
                                        src="/horus_ecosystem_symbol.png"
                                        alt="Horus"
                                        className="h-11 object-contain pointer-events-none drop-shadow-lg"
                                    />
                                </div>

                                {/* End block: Plan Name & Unit Name + Dropdown */}
                                <div className="flex items-stretch">
                                    <div className="flex flex-col items-center justify-center px-3 min-w-[140px]">
                                        <span className="text-[13px] font-bold text-slate-800 dark:text-white leading-none mb-0.5">
                                            {activePlan ? (activePlan.name?.[i18n.language] || activePlan.name?.['en']) : '---'}
                                        </span>
                                        <span className="text-[11px] text-slate-500 dark:text-slate-300 leading-none">
                                            {session ? formatUnitName(session.unit, t, i18n.language) : '---'}
                                        </span>
                                    </div>

                                    <div className="flex items-center pe-1.5 ps-0.5">
                                        <button className="flex items-center justify-center p-1 rounded-md bg-slate-200 dark:bg-[#4a4d51] hover:bg-slate-300 dark:hover:bg-[#5a5d61] transition-colors border-none">
                                            <ChevronUp className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                                        </button>
                                    </div>
                                </div>

                            </div>
                        </div>

                        {/* Start section (left in RTL): utility icons */}
                        <div className="flex items-center gap-3 text-slate-500 dark:text-zinc-400">
                            <Eraser className="w-4 h-4 cursor-pointer hover:text-slate-800 dark:hover:text-zinc-200 transition-colors" onClick={handleResetChat} />
                            <RefreshCw className="w-4 h-4 cursor-pointer hover:text-slate-800 dark:hover:text-zinc-200 transition-colors" onClick={handleResetDataClick} />
                            <Settings className="w-4 h-4 cursor-pointer hover:text-slate-800 dark:hover:text-zinc-200 transition-colors" />
                            <HelpCircle className="w-4 h-4 cursor-pointer hover:text-slate-800 dark:hover:text-zinc-200 transition-colors" />
                        </div>
                    </header>

                    <div className="flex flex-1 overflow-hidden">
                        {/* Sidebar Navigation */}
                        <AnimatePresence initial={false}>
                            {isSidebarVisible && (
                                <motion.aside
                                    initial={{ width: 0, opacity: 0 }}
                                    animate={{ width: 64, opacity: 1 }}
                                    exit={{ width: 0, opacity: 0 }}
                                    transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                                    className="flex flex-col bg-white dark:bg-zinc-900 border-e border-slate-200 dark:border-zinc-800 overflow-x-hidden overflow-y-auto py-1 justify-between shrink-0"
                                >
                                    <div className="w-16 flex flex-col min-h-full justify-between shrink-0">
                                        <div className="space-y-0.5 px-1">
                                            <NavItem
                                                icon={<Map className="w-5 h-5" />}
                                                label={t('nav.main')}
                                                active={currentSection === 'main'}
                                                onClick={() => {
                                                    setCurrentSection('main');
                                                    closePanel();
                                                }}
                                                isDarkMode={isDarkMode}
                                                isCollapsed={isSidebarCollapsed}
                                            />
                                            <NavItem
                                                icon={<ScrollText className="w-5 h-5" />}
                                                label={t('header.planning')}
                                                active={openPanel === 'planning' || isOrderSectionActive}
                                                onClick={() => {
                                                    if (!isOrderSectionActive) {
                                                        setCurrentSection('general');
                                                    }
                                                    setOpenPanel('planning');
                                                }}
                                                isDarkMode={isDarkMode}
                                                isCollapsed={isSidebarCollapsed}
                                            />
                                            <NavItem
                                                icon={<Shield className="w-5 h-5" />}
                                                label={t('nav.control')}
                                                active={openPanel === 'control' || isControlSectionActive}
                                                onClick={() => {
                                                    if (!isControlSectionActive) {
                                                        setCurrentSection('telecom_journal');
                                                    }
                                                    setOpenPanel('control');
                                                }}
                                                isDarkMode={isDarkMode}
                                                isCollapsed={isSidebarCollapsed}
                                            />
                                            <NavItem
                                                icon={<Radio className="w-5 h-5" />}
                                                label={t('nav.radio')}
                                                active={currentSection === 'radio'}
                                                onClick={() => {
                                                    setCurrentSection('radio');
                                                    closePanel();
                                                }}
                                                isDarkMode={isDarkMode}
                                                isCollapsed={isSidebarCollapsed}
                                            />
                                            <NavItem
                                                icon={<Waves className="w-5 h-5" />}
                                                label={t('spectrum.layerName')}
                                                active={openPanel === 'spectrum' || isSpectrumSectionActive}
                                                onClick={() => {
                                                    if (!isSpectrumSectionActive) {
                                                        setCurrentSection('spectrum_jamming');
                                                    }
                                                    setOpenPanel('spectrum');
                                                }}
                                                isDarkMode={isDarkMode}
                                                isCollapsed={isSidebarCollapsed}
                                            />
                                            <NavItem
                                                icon={<Eye className="w-5 h-5" />}
                                                label={t('nav.monitoring')}
                                                active={openPanel === 'monitoring' || isMonitoringSectionActive}
                                                onClick={() => {
                                                    if (!isMonitoringSectionActive) {
                                                        setCurrentSection('tikshov_cop');
                                                    }
                                                    setOpenPanel('monitoring');
                                                }}
                                                isDarkMode={isDarkMode}
                                                isCollapsed={isSidebarCollapsed}
                                            />
                                            <NavItem
                                                icon={<Settings className="w-5 h-5" />}
                                                label={t('nav.management')}
                                                active={openPanel === 'management' || isManagementSectionActive}
                                                onClick={() => {
                                                    if (!isManagementSectionActive) {
                                                        setCurrentSection('plans');
                                                    }
                                                    setOpenPanel('management');
                                                }}
                                                isDarkMode={isDarkMode}
                                                isCollapsed={isSidebarCollapsed}
                                            />
                                        </div>

                                        <div className="space-y-0.5 px-1">
                                            <div className="my-1 border-t border-slate-100 dark:border-zinc-800"></div>
                                            <NavItem
                                                icon={<Globe className="w-5 h-5" />}
                                                label={i18n.language === 'en' ? 'עברית' : 'English'}
                                                onClick={() => i18n.changeLanguage(i18n.language === 'en' ? 'he' : 'en')}
                                                isDarkMode={isDarkMode}
                                                isCollapsed={isSidebarCollapsed}
                                            />
                                            <NavItem icon={<Palette className="w-5 h-5" />} label={t('nav.switch_theme')} onClick={toggleTheme} isDarkMode={isDarkMode} isCollapsed={isSidebarCollapsed} />
                                            <div className="my-1 border-t border-slate-100 dark:border-zinc-800"></div>
                                            <NavItem icon={<LogOut className="w-5 h-5" />} label={t('nav.sign_out')} onClick={handleSignOut} isDarkMode={isDarkMode} isCollapsed={isSidebarCollapsed} />

                                            <div className="flex justify-center mt-6 mb-2">
                                                <button
                                                    onClick={() => window.dispatchEvent(new CustomEvent('horus-toggle-chat'))}
                                                    className="flex items-center justify-center w-12 h-12 rounded-full bg-primary text-white shadow-lg hover:bg-primary/90 hover:scale-105 transition-all"
                                                    title="Toggle AI Chat"
                                                >
                                                    <Sparkles className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </motion.aside>
                            )}
                        </AnimatePresence>

                        {/* Content column: category bar + main content, confined to the
                            space beside the icon sidebar so the bar never spans under it
                            or pushes its buttons down. */}
                        <div className="flex flex-col flex-1 overflow-hidden">
                            {/* Category bar: a horizontal strip pinned above the content area.
                                Hidden only on the map (ראשי) so the map gets the full height;
                                everywhere else it's always rendered (never mounted/unmounted)
                                so switching between categories never collapses and reopens the
                                layout — it just shows whichever category's buttons are
                                relevant, or stays empty for categories with none (radio /
                                spectrum). */}
                            {currentSection !== 'main' && (
                            <div className="flex items-center gap-1 min-h-[52px] bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 overflow-x-auto overflow-y-hidden shrink-0 shadow-sm z-10 px-3 py-2">
                                {openPanel === 'planning' && (() => {
                                            const planningItems = session?.role === 'telecomOfficer' ? [
                                                { id: 'telecom_journal', icon: <ScrollText className="w-4 h-4" />, label: t('nav.telecom_journal') },
                                                { id: 'telecom_deployment', icon: <Map className="w-4 h-4" />, label: t('nav.telecom_deployment') },
                                            ] : [
                                                { id: 'general', icon: <ClipboardList className="w-4 h-4" />, label: t('nav.general') },
                                                { id: 'objective', icon: <Crosshair className="w-4 h-4" />, label: t('nav.objective') },
                                                { id: 'mission', icon: <Flag className="w-4 h-4" />, label: t('nav.mission') },
                                                { id: 'intelligence', icon: <Target className="w-4 h-4" />, label: t('nav.intelligence') },
                                                { id: 'method', icon: <Lightbulb className="w-4 h-4" />, label: t('nav.method') },
                                                { id: 'tasks', icon: <CheckSquare className="w-4 h-4" />, label: t('nav.tasks') },
                                                { id: 'diagram', icon: <PenTool className="w-4 h-4" />, label: t('nav.diagram') },
                                                { id: 'calendar', icon: <CalendarIcon className="w-4 h-4" />, label: t('nav.calendar') },
                                            ];
                                            return (
                                                <>
                                                    <div className="flex items-center gap-1">
                                                        {planningItems.map((item) => (
                                                            <button
                                                                key={item.id}
                                                                onClick={() => setCurrentSection(item.id as any)}
                                                                className={`flex flex-row items-center gap-2 px-3 py-2 rounded-lg whitespace-nowrap transition-colors duration-200 text-sm font-medium shrink-0 ${currentSection === item.id
                                                                    ? 'bg-primary/10 text-primary'
                                                                    : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-900 dark:hover:text-zinc-200'
                                                                    }`}
                                                            >
                                                                <div className={`shrink-0 ${currentSection === item.id ? 'text-primary' : ''}`}>{item.icon}</div>
                                                                <span className="leading-none">{item.label}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </>
                                            );
                                        })()}

                                        {openPanel === 'control' && (
                                            <>
                                                <div className="flex items-center gap-1">
                                                    {([
                                                        { id: 'telecom_journal', icon: <ScrollText className="w-4 h-4" />, label: t('nav.telecom_journal') },
                                                        { id: 'combat_script', icon: <Swords className="w-4 h-4" />, label: t('nav.combat_script') },
                                                        { id: 'personal_task_log', icon: <ListChecks className="w-4 h-4" />, label: t('nav.personal_task_log') },
                                                    ] as const).map((item) => (
                                                        <button
                                                            key={item.id}
                                                            onClick={() => setCurrentSection(item.id as any)}
                                                            className={`flex flex-row items-center gap-2 px-3 py-2 rounded-lg whitespace-nowrap transition-colors duration-200 text-sm font-medium shrink-0 ${currentSection === item.id
                                                                ? 'bg-primary/10 text-primary'
                                                                : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-900 dark:hover:text-zinc-200'
                                                                }`}
                                                        >
                                                            <div className={`shrink-0 ${currentSection === item.id ? 'text-primary' : ''}`}>{item.icon}</div>
                                                            <span className="leading-none">{item.label}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </>
                                        )}

                                        {openPanel === 'monitoring' && (
                                            <div className="flex items-center gap-1">
                                                {([
                                                    { id: 'static_space', icon: <RadioTower className="w-4 h-4" />, label: t('nav.static_space') },
                                                    { id: 'tikshov_cop', icon: <Radar className="w-4 h-4" />, label: t('nav.tikshov_cop') },
                                                ] as const).map((item) => (
                                                    <button
                                                        key={item.id}
                                                        onClick={() => setCurrentSection(item.id as any)}
                                                        className={`flex flex-row items-center gap-2 px-3 py-2 rounded-lg whitespace-nowrap transition-colors duration-200 text-sm font-medium shrink-0 ${currentSection === item.id
                                                            ? 'bg-primary/10 text-primary'
                                                            : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-900 dark:hover:text-zinc-200'
                                                            }`}
                                                    >
                                                        <div className={`shrink-0 ${currentSection === item.id ? 'text-primary' : ''}`}>{item.icon}</div>
                                                        <span className="leading-none">{item.label}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        {openPanel === 'spectrum' && (
                                            <div className="flex items-center gap-1">
                                                {([
                                                    { id: 'spectrum_jamming', icon: <Radio className="w-4 h-4" />, label: t('spectrum.tabs.jamming') },
                                                    { id: 'spectrum_blocking', icon: <Ban className="w-4 h-4" />, label: t('spectrum.tabs.blocking') },
                                                ] as const).map((item) => (
                                                    <button
                                                        key={item.id}
                                                        onClick={() => setCurrentSection(item.id as any)}
                                                        className={`flex flex-row items-center gap-2 px-3 py-2 rounded-lg whitespace-nowrap transition-colors duration-200 text-sm font-medium shrink-0 ${currentSection === item.id
                                                            ? 'bg-primary/10 text-primary'
                                                            : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-900 dark:hover:text-zinc-200'
                                                            }`}
                                                    >
                                                        <div className={`shrink-0 ${currentSection === item.id ? 'text-primary' : ''}`}>{item.icon}</div>
                                                        <span className="leading-none">{item.label}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        {openPanel === 'management' && (
                                            <>
                                                <div className="flex items-center gap-1">
                                                    {([
                                                        { id: 'sync_efforts', icon: <Grid3x3 className="w-4 h-4" />, label: t('nav.sync_efforts') },
                                                        { id: 'order', icon: <ScrollText className="w-4 h-4" />, label: t('nav.order') },
                                                        { id: 'definitions', icon: <SlidersHorizontal className="w-4 h-4" />, label: t('nav.definitions') },
                                                        { id: 'plans', icon: <Library className="w-4 h-4" />, label: t('nav.plans') },
                                                    ] as const).map((item) => (
                                                        <button
                                                            key={item.id}
                                                            onClick={() => setCurrentSection(item.id as any)}
                                                            className={`flex flex-row items-center gap-2 px-3 py-2 rounded-lg whitespace-nowrap transition-colors duration-200 text-sm font-medium shrink-0 ${currentSection === item.id
                                                                ? 'bg-primary/10 text-primary'
                                                                : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-900 dark:hover:text-zinc-200'
                                                                }`}
                                                        >
                                                            <div className={`shrink-0 ${currentSection === item.id ? 'text-primary' : ''}`}>{item.icon}</div>
                                                            <span className="leading-none">{item.label}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </>
                                        )}
                            </div>
                            )}

                            {/* Main Content Area */}
                            <MapProvider currentSection={currentSection}>
                                <AnalysisProvider>
                                    <DocProvider>
                                        <main className="flex-1 flex bg-slate-50 dark:bg-zinc-950 overflow-hidden transition-colors duration-200 relative">
                                            <ContentArea
                                                currentSection={currentSection}
                                                chatKey={chatKey}
                                                activePlan={activePlan}
                                                setCurrentSection={setCurrentSection}
                                                session={session}
                                            />

                                            <DocEdgeHandle />
                                            <DocPanel />
                                            <MapEdgeHandle />
                                            <MapPanel />
                                        </main>
                                        <AddCommSitesModal />
                                        <CommSiteDetailPage />
                                    </DocProvider>
                                </AnalysisProvider>
                            </MapProvider>
                        </div>
                    </div>
                </PersonalTaskLogProvider>
                </CombatLogProvider>
                </SpectrumProvider>
                </TikshovProvider>
                </StaticSpaceProvider>
            )}

            {/* Reset Confirmation Modal */}
            {isResetModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-zinc-800 animate-in zoom-in-95 duration-200">
                        <div className="p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3 text-red-600 dark:text-red-500">
                                    <TriangleAlert className="w-5 h-5 shrink-0" />
                                    <h3 className="text-lg font-medium text-slate-900 dark:text-white">
                                        {t('resetModal.title')}
                                    </h3>
                                </div>
                                <button
                                    onClick={() => setIsResetModalOpen(false)}
                                    className="text-slate-400 hover:text-slate-500 dark:hover:text-zinc-300 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <p className="text-slate-600 dark:text-zinc-300 mb-6 text-sm">
                                {t('resetModal.description')}
                            </p>
                            <div className="flex items-center justify-center gap-3">
                                <button
                                    onClick={() => setIsResetModalOpen(false)}
                                    className="text-sm px-4 py-2 text-slate-600 dark:text-zinc-300 hover:text-slate-800 dark:hover:text-zinc-100 transition-colors font-medium"
                                >
                                    {t('resetModal.cancel')}
                                </button>
                                <button
                                    onClick={confirmResetData}
                                    className="text-sm px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium shadow-sm"
                                >
                                    {t('resetModal.confirm')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
