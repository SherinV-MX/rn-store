import 'server-only';

const dictionaries: Record<string, () => Promise<any>> = {
    en: () => import('./en.json').then((module) => module.default),
    de: () => import('./de.json').then((module) => module.default),
};

export const getDictionary = async (locale: string) => {
    return dictionaries[locale] ? dictionaries[locale]() : dictionaries.en();
};
