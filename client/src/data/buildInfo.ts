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

/**
 * The values come from the build, but only a plain hash and an https repository address are
 * accepted, so the footer can never be made to show or link to anything else.
 */
export function buildInfoFrom(env: BuildEnv): BuildInfo | null {
  const hash = env.VITE_COMMIT_HASH?.trim() ?? "";
  if (!COMMIT_HASH_PATTERN.test(hash)) {
    return null;
  }
  const repository = (env.VITE_REPOSITORY_URL ?? "").trim().replace(/\/+$/, "");
  return {
    shortHash: hash.slice(0, SHORT_HASH_LENGTH),
    commitUrl: REPOSITORY_URL_PATTERN.test(repository)
      ? `${repository}/commit/${hash}`
      : null,
  };
}

export const buildInfo = buildInfoFrom(import.meta.env);
