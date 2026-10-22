import { type Language, LANGUAGES } from "@/data/strings";

function isLanguage(code: string | null): code is Language {
  return LANGUAGES.some((language) => language === code);
}

function languageOfTag(tag: string): Language | null {
  const primary = tag.toLowerCase().split("-")[0] ?? "";
  return isLanguage(primary) ? primary : null;
}

/**
 * A saved choice wins. Otherwise the first browser language that is offered decides,
 * so a visitor preferring "fr" and then "de" still gets German.
 */
export function pickLanguage(
  preferred: readonly string[],
  saved: string | null,
): Language {
  if (isLanguage(saved)) {
    return saved;
  }
  return (
    preferred.map(languageOfTag).find((language) => language !== null) ?? "en"
  );
}
