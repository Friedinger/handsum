export interface LegalLinks {
  readonly imprintUrl: string | null;
  readonly privacyUrl: string | null;
}

interface LegalLinkEnv {
  readonly VITE_IMPRINT_URL?: string;
  readonly VITE_PRIVACY_URL?: string;
}

const LINK_PATTERN = /^(https?:\/\/|\/(?!\/))/;

/**
 * Only web addresses and paths on the same host become links, so a wrong variable can never
 * produce a `javascript:` link.
 */
function linkOrNull(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return LINK_PATTERN.test(trimmed) ? trimmed : null;
}

export function legalLinksFrom(env: LegalLinkEnv): LegalLinks {
  return {
    imprintUrl: linkOrNull(env.VITE_IMPRINT_URL),
    privacyUrl: linkOrNull(env.VITE_PRIVACY_URL),
  };
}

export const legalLinks = legalLinksFrom(import.meta.env);
