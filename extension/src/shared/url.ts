/**
 * Canonicalize a LinkedIn job listing URL for dedupe/display purposes.
 *
 * The API also canonicalizes `sourceUrl` server-side before its uniqueness
 * check (see docs/API_CONTRACT.md), so this doesn't need to be perfect —
 * but sending an already-clean URL avoids relying on that and makes the
 * "same listing" prompt-suppression logic in the content script correct
 * without a round trip to the backend.
 *
 * Strips query params/fragments and trailing slashes, and normalizes
 * `/jobs/view/<id>/...` down to the canonical `/jobs/view/<id>/` form so
 * that tracking params (e.g. `?refId=...&trackingId=...`) don't produce
 * spurious duplicates.
 */
export function canonicalizeListingUrl(rawUrl: string): string {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return rawUrl;
  }

  url.search = "";
  url.hash = "";

  const jobViewMatch = url.pathname.match(/\/jobs\/view\/(\d+)/);
  if (jobViewMatch) {
    url.pathname = `/jobs/view/${jobViewMatch[1]}/`;
    return url.toString();
  }

  // Search/collections pages carry the active listing id in a query param
  // (currentJobId) rather than the path. Prefer that as a stable canonical
  // URL when present, since the search page URL itself changes constantly.
  const currentJobId = new URL(rawUrl).searchParams.get("currentJobId");
  if (currentJobId) {
    return `https://www.linkedin.com/jobs/view/${currentJobId}/`;
  }

  if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
    url.pathname = url.pathname.slice(0, -1);
  }

  return url.toString();
}

/**
 * Pull a LinkedIn job posting id out of a URL, whether it's in the path
 * (`/jobs/view/12345`) or the `currentJobId` query param used by the
 * search/collections listing panel.
 */
export function extractJobId(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl);
    const pathMatch = url.pathname.match(/\/jobs\/view\/(\d+)/);
    if (pathMatch) return pathMatch[1] ?? null;
    return url.searchParams.get("currentJobId");
  } catch {
    return null;
  }
}
