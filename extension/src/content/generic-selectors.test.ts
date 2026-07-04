import { beforeEach, describe, expect, it } from "vitest";
import { extractGenericListing, looksLikeJobPosting } from "./generic-selectors";

function setPage({
  path = "/",
  head = "",
  body = "",
}: {
  path?: string;
  head?: string;
  body?: string;
}): void {
  const url = new URL(path, "https://example.com");
  Object.defineProperty(window, "location", {
    value: { href: url.href, pathname: url.pathname, search: url.search, hash: url.hash },
    writable: true,
    configurable: true,
  });
  document.head.innerHTML = head;
  document.body.innerHTML = body;
}

function jobPostingScript(data: Record<string, unknown>): string {
  return `<script type="application/ld+json">${JSON.stringify(data)}</script>`;
}

describe("looksLikeJobPosting", () => {
  beforeEach(() => setPage({}));

  it("is true whenever a JobPosting JSON-LD block is present, regardless of URL", () => {
    setPage({ path: "/about", head: jobPostingScript({ "@type": "JobPosting", title: "Engineer" }) });
    expect(looksLikeJobPosting()).toBe(true);
  });

  it("is false on a non-job URL with no JSON-LD", () => {
    setPage({ path: "/about", body: "<h1>About us</h1>" });
    expect(looksLikeJobPosting()).toBe(false);
  });

  it("is false on a job-shaped URL with no title signal", () => {
    setPage({ path: "/careers/123", body: "<p>No heading here</p>" });
    expect(looksLikeJobPosting()).toBe(false);
  });

  it("is true on a job-shaped URL with an h1", () => {
    setPage({ path: "/jobs/123", body: "<h1>Backend Engineer</h1>" });
    expect(looksLikeJobPosting()).toBe(true);
  });

  it("is true on a job-shaped URL with only an og:title meta tag", () => {
    setPage({
      path: "/careers/vacancy/123",
      head: '<meta property="og:title" content="Backend Engineer">',
    });
    expect(looksLikeJobPosting()).toBe(true);
  });
});

describe("extractGenericListing", () => {
  beforeEach(() => setPage({}));

  it("returns null when the page doesn't look like a job posting", () => {
    setPage({ path: "/about", body: "<h1>About us</h1>" });
    expect(extractGenericListing()).toBeNull();
  });

  it("extracts a full listing from JSON-LD, including location/salary/logo", () => {
    setPage({
      path: "/jobs/123",
      head: jobPostingScript({
        "@type": "JobPosting",
        title: "Site Reliability Engineer",
        hiringOrganization: { name: "Zeta Corp", logo: "https://example.com/logo.png" },
        jobLocation: { address: { addressLocality: "Austin", addressRegion: "TX" } },
        baseSalary: { currency: "USD", value: { minValue: 150000, maxValue: 190000, unitText: "YEAR" } },
        datePosted: "2026-06-01",
      }),
    });

    const listing = extractGenericListing();
    expect(listing).toEqual({
      sourceUrl: "https://example.com/jobs/123",
      companyName: "Zeta Corp",
      jobTitle: "Site Reliability Engineer",
      locationText: "Austin, TX",
      salaryText: "USD 150000-190000/year",
      postedAt: "2026-06-01",
      companyLogoUrl: "https://example.com/logo.png",
    });
  });

  it("falls back to og:title/og:site_name/h1 when there's no JSON-LD", () => {
    setPage({
      path: "/careers/123",
      head: `
        <meta property="og:title" content="Support Engineer">
        <meta property="og:site_name" content="Acme Inc">
      `,
      body: "<h1>Support Engineer</h1>",
    });

    const listing = extractGenericListing();
    expect(listing?.jobTitle).toBe("Support Engineer");
    expect(listing?.companyName).toBe("Acme Inc");
    expect(listing?.companyLogoUrl).toBeNull();
  });

  it("returns null when company can't be determined even though title can", () => {
    setPage({
      path: "/careers/123",
      head: '<meta property="og:title" content="Support Engineer">',
    });
    expect(extractGenericListing()).toBeNull();
  });

  it("never trusts a DOM/favicon fallback for the company logo", () => {
    setPage({
      path: "/jobs/123",
      head: `
        <meta property="og:title" content="Support Engineer">
        <meta property="og:site_name" content="Acme Inc">
        <link rel="icon" href="https://example.com/favicon.ico">
      `,
      body: "<h1>Support Engineer</h1>",
    });
    expect(extractGenericListing()?.companyLogoUrl).toBeNull();
  });
});
