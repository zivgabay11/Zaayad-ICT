import React from 'react';
import { RadioTower } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { NavItem } from './NavItem';
import { useStaticSpaceContext } from '../context/StaticSpaceContext';

// Thin wrapper so the sidebar's NavItem can read StaticSpaceContext — it must be a
// descendant of <StaticSpaceProvider>, not the same component that renders the provider.
export const StaticSpaceNavButton: React.FC<{ isDarkMode: boolean; isCollapsed?: boolean }> = ({ isDarkMode, isCollapsed }) => {
    const { t } = useTranslation();
    const { isDrawerOpen, openDrawer } = useStaticSpaceContext();

    return (
        <NavItem
            icon={<RadioTower className="w-5 h-5" />}
            label={t('nav.static_space')}
            active={isDrawerOpen}
            onClick={openDrawer}
            isDarkMode={isDarkMode}
            isCollapsed={isCollapsed}
        />
    );
};
