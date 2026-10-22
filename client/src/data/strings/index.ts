import { de } from "@/data/strings/de";
import { en } from "@/data/strings/en";
import type { Strings } from "@/data/strings/types";

export const LANGUAGES = ["en", "de"] as const;

export type Language = (typeof LANGUAGES)[number];

const stringsByLanguage: Record<Language, Strings> = { en, de };

/**
 * Both are live bindings that `selectLanguage` replaces once, before the app is imported.
 * Everything that reads `strings` while its module loads therefore sees the chosen language.
 */
export let activeLanguage: Language = "en";
export let strings: Strings = en;

export function selectLanguage(language: Language): void {
  activeLanguage = language;
  strings = stringsByLanguage[language];
}
