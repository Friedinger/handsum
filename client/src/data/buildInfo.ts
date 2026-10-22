export interface BuildInfo {
  readonly shortHash: string;
  readonly commitUrl: string | null;
}

interface BuildEnv {
  readonly VITE_COMMIT_HASH?: string;
  readonly VITE_REPOSITORY_URL?: string;
}

const COMMIT_HASH_PATTERN = /^[0-9a-f]{7,40}$/;
const REPOSITORY_URL_PATTERN = /^https:\/\/[^\s/]+(\/[\w.-]+)+$/;
const SHORT_HASH_LENGTH = 7;
/** Matches the "📜 Disclaimer" heading of the README. */
const README_DISCLAIMER_ANCHOR = "#-disclaimer";

function repositoryUrlFrom(env: BuildEnv): string | null {
  const repository = (env.VITE_REPOSITORY_URL ?? "").trim().replace(/\/+$/, "");
  return REPOSITORY_URL_PATTERN.test(repository) ? repository : null;
}

/**
 * The values come from the build, but only a plain hash and an https repository address are
 * accepted, so the footer can never be made to show or link to anything else.
 */
export function buildInfoFrom(env: BuildEnv): BuildInfo | null {
  const hash = env.VITE_COMMIT_HASH?.trim() ?? "";
  if (!COMMIT_HASH_PATTERN.test(hash)) {
    return null;
  }
  const repository = repositoryUrlFrom(env);
  return {
    shortHash: hash.slice(0, SHORT_HASH_LENGTH),
    commitUrl: repository ? `${repository}/commit/${hash}` : null,
  };
}

export function disclaimerUrlFrom(env: BuildEnv): string | null {
  const repository = repositoryUrlFrom(env);
  return repository ? `${repository}${README_DISCLAIMER_ANCHOR}` : null;
}

export const buildInfo = buildInfoFrom(import.meta.env);
export const disclaimerUrl = disclaimerUrlFrom(import.meta.env);
