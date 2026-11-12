import { de } from "@/data/strings/de";
import { devMode as deDevMode } from "@/data/strings/de/devMode";
import { en } from "@/data/strings/en";
import { devMode as enDevMode } from "@/data/strings/en/devMode";
import type { DevModeStrings, Strings } from "@/data/strings/types";

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

/**
 * Kept apart from `strings` so the production build, which never shows the test mode, can drop
 * these texts.
 */
export function devModeStrings(): DevModeStrings {
  return activeLanguage === "de" ? deDevMode : enDevMode;
}
