export type ShareResult = "shared" | "cancelled" | "failed";

export function canShareLink(): boolean {
  return typeof navigator.share === "function";
}

export async function shareLink(
  url: string,
  title: string,
): Promise<ShareResult> {
  try {
    await navigator.share({ url, title });
    return "shared";
  } catch (error) {
    return error instanceof DOMException && error.name === "AbortError"
      ? "cancelled"
      : "failed";
  }
}
