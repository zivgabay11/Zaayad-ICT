import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Session, UserRole } from '../../common/utilities/types';
import { mockUsers, mockUnits } from '../../common/utilities/mockData';
import { formatUnitName } from '../../common/utilities/formatting';
import { ALL_ROLES } from '../../common/utilities/roles';

interface LoginScreenProps {
    onLogin: (session: Session) => void;
    isDarkMode: boolean;
}

export function LoginScreen({ onLogin, isDarkMode }: LoginScreenProps) {
    const { t, i18n } = useTranslation();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [selectedUnitId, setSelectedUnitId] = useState<string>('');
    const [selectedRole, setSelectedRole] = useState<UserRole>('' as UserRole);
    const [error, setError] = useState('');
    const isRtl = i18n.dir() === 'rtl';

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const user = mockUsers.find(u => u.username.toLowerCase() === email.toLowerCase() && u.password === password);
        if (user) {
            const unit = mockUnits.find(u => String(u.code) === selectedUnitId) || mockUnits[0];
            onLogin({ user, unit, role: selectedRole, cell: 'control', reality: 'operational' });
        } else {
            setError(t('login.error'));
        }
    };

    const inputClasses = `w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors ${isDarkMode
        ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500'
        : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
        }`;
    const selectClasses = `${inputClasses} ${isRtl ? 'bg-[position:left_0.75rem_center] pl-10 pr-4 appearance-none' : ''}`;

    return (
        <div className={`flex flex-col items-center justify-center min-h-screen ${isDarkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
            <div className={`w-full max-w-md p-8 sm:p-12 space-y-8 rounded-2xl shadow-xl ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}>
                <div className="flex flex-col items-center justify-center space-y-6">
                    <img
                        src={isDarkMode ? "/horus_ecosystem_symbol.png" : "/horus_ecosystem_symbol.png"}
                        alt="Horus"
                        className="h-10 object-contain"
                    />
                    <div className="text-center">
                        <h2 className={`text-2xl font-semibold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                            {t('login.title')}
                        </h2>
                        <p className={`text-sm mt-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            {t('login.subtitle')}
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className={`block text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                            {t('login.username')}
                        </label>
                        <input
                            type="text"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder={t('login.usernamePlaceholder')}
                            className={inputClasses}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className={`block text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                            {t('login.password')}
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder={t('login.passwordPlaceholder')}
                            className={inputClasses}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className={`block text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                            {t('login.selectUnit')}
                        </label>
                        <select
                            value={selectedUnitId}
                            onChange={(e) => setSelectedUnitId(e.target.value)}
                            className={selectClasses}
                        >
                            <option value="" disabled>{t('login.selectUnitPlaceholder')}</option>
                            {mockUnits.map(unit => (
                                <option key={unit.code} value={String(unit.code)}>
                                    {formatUnitName(unit, t, i18n.language)}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className={`block text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                            {t('login.selectRole')}
                        </label>
                        <select
                            value={selectedRole}
                            onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                            className={selectClasses}
                        >
                            <option value="" disabled>{t('login.selectRolePlaceholder')}</option>
                            {ALL_ROLES.map(role => (
                                <option key={role} value={role}>{t(`roles.${role}`)}</option>
                            ))}
                        </select>
                    </div>

                    {error && (
                        <div className="text-red-500 text-sm text-center font-medium">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="w-full py-3 px-4 bg-primary hover:bg-primary/90 text-white dark:text-zinc-900 font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary mt-4"
                    >
                        {t('login.signIn')}
                    </button>
                </form>
            </div>
        </div>
    );
}
