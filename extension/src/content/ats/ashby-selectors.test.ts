import { beforeEach, describe, expect, it } from "vitest";
import { extractAshbyListing } from "./ashby-selectors";

function setPage({ path, head = "" }: { path: string; head?: string }): void {
  const url = new URL(path, "https://jobs.ashbyhq.com");
  Object.defineProperty(window, "location", {
    value: { href: url.href, pathname: url.pathname, search: url.search, hash: url.hash },
    writable: true,
    configurable: true,
  });
  document.head.innerHTML = head;
  document.body.innerHTML = "";
}

function jobPostingScript(data: Record<string, unknown>): string {
  return `<script type="application/ld+json">${JSON.stringify(data)}</script>`;
}

describe("extractAshbyListing", () => {
  beforeEach(() => setPage({ path: "/" }));

  // Shape verified live against jobs.ashbyhq.com/openai/<uuid>.
  it("extracts everything from JSON-LD, including structured salary", () => {
    setPage({
      path: "/openai/00207abc-49b7-465c-a219-f7c1140f8047",
      head: jobPostingScript({
        "@type": "JobPosting",
        title: "Forward Deployed Software Engineer - SF",
        hiringOrganization: {
          name: "OpenAI",
          logo: "https://app.ashbyhq.com/api/images/org-theme-logo/logo.png",
        },
        jobLocation: {
          address: { addressLocality: "San Francisco", addressRegion: "California" },
        },
        datePosted: "2025-11-15",
        baseSalary: {
          currency: "USD",
          value: { minValue: 185000, maxValue: 325000, unitText: "YEAR" },
        },
      }),
    });

    expect(extractAshbyListing()).toEqual({
      sourceUrl: "https://jobs.ashbyhq.com/openai/00207abc-49b7-465c-a219-f7c1140f8047",
      companyName: "OpenAI",
      jobTitle: "Forward Deployed Software Engineer - SF",
      locationText: "San Francisco, California",
      salaryText: "USD 185000-325000/year",
      postedAt: "2025-11-15",
      companyLogoUrl: "https://app.ashbyhq.com/api/images/org-theme-logo/logo.png",
    });
  });

  it("returns null when there's no JSON-LD at all", () => {
    setPage({ path: "/acme/abc123" });
    expect(extractAshbyListing()).toBeNull();
  });

  it("returns null when JSON-LD is missing the company name", () => {
    setPage({
      path: "/acme/abc123",
      head: jobPostingScript({ "@type": "JobPosting", title: "Staff Engineer" }),
    });
    expect(extractAshbyListing()).toBeNull();
  });

  it("never throws on malformed JSON-LD", () => {
    setPage({ path: "/acme/abc123", head: '<script type="application/ld+json">{not valid</script>' });
    expect(() => extractAshbyListing()).not.toThrow();
  });
});
