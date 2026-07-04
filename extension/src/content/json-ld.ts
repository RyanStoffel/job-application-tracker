// Shared schema.org JobPosting JSON-LD parsing, used by both the LinkedIn
// extractor (content/selectors.ts) and the generic fallback extractor
// (content/generic-selectors.ts) — most job boards/ATS platforms embed this
// for SEO, and it's the most structured/reliable source when present.

export interface JsonLdJobPosting {
  "@type"?: string;
  title?: string;
  hiringOrganization?: { name?: string; logo?: string | { url?: string } };
  jobLocation?: { address?: { addressLocality?: string; addressRegion?: string } };
  baseSalary?: {
    value?: { minValue?: number; maxValue?: number; value?: number; unitText?: string };
    currency?: string;
  };
  datePosted?: string;
}

/** Best-effort parse of a JobPosting JSON-LD block on the current page, if present. */
export function readJsonLdJobPosting(): JsonLdJobPosting | null {
  const scripts = document.querySelectorAll('script[type="application/ld+json"]');
  for (const script of scripts) {
    try {
      const data = JSON.parse(script.textContent ?? "");
      const candidates = Array.isArray(data) ? data : [data];
      for (const candidate of candidates) {
        if (candidate && candidate["@type"] === "JobPosting") {
          return candidate as JsonLdJobPosting;
        }
        // Some sites nest it under @graph.
        if (Array.isArray(candidate?.["@graph"])) {
          const nested = candidate["@graph"].find(
            (n: JsonLdJobPosting) => n?.["@type"] === "JobPosting",
          );
          if (nested) return nested as JsonLdJobPosting;
        }
      }
    } catch {
      continue;
    }
  }
  return null;
}

export function formatSalaryFromJsonLd(baseSalary: JsonLdJobPosting["baseSalary"]): string | null {
  if (!baseSalary?.value) return null;
  const { minValue, maxValue, value } = baseSalary.value;
  const currency = baseSalary.currency ?? "";
  const unit = baseSalary.value.unitText ? `/${baseSalary.value.unitText.toLowerCase()}` : "";
  if (typeof minValue === "number" && typeof maxValue === "number") {
    return `${currency} ${minValue}-${maxValue}${unit}`.trim();
  }
  if (typeof value === "number") {
    return `${currency} ${value}${unit}`.trim();
  }
  return null;
}

/** schema.org `logo` can be a bare URL string or an ImageObject with a `url`. */
export function readJsonLdLogoUrl(logo: string | { url?: string } | undefined): string | null {
  if (typeof logo === "string") return logo || null;
  if (logo && typeof logo === "object" && typeof logo.url === "string") return logo.url || null;
  return null;
}
