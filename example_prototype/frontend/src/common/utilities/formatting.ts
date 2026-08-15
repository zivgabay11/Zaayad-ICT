import { TFunction } from 'i18next';
import { Unit } from './types';

export const formatUnitName = (unit: Unit, t: TFunction, language: string): string => {
    if (unit.name && unit.name[language]) {
        return unit.name[language];
    }
    return `${t(`definitions.levels.${unit.type}`, { defaultValue: unit.type })} ${unit.code}`;
};
