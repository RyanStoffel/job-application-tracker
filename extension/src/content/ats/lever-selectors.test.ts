import { beforeEach, describe, expect, it } from "vitest";
import { extractLeverListing } from "./lever-selectors";

function setPage({ path, head = "", body = "" }: { path: string; head?: string; body?: string }): void {
  const url = new URL(path, "https://jobs.lever.co");
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

describe("extractLeverListing", () => {
  beforeEach(() => setPage({ path: "/" }));

  // Shape verified live against jobs.lever.co/palantir/<uuid>.
  it("prefers JSON-LD for title/company/location/logo", () => {
    setPage({
      path: "/palantir/0bbfd4f4-41ff-4ec6-b73f-5200efd5d4d3",
      head: jobPostingScript({
        "@type": "JobPosting",
        title: "Administrative Business Partner - Security",
        hiringOrganization: {
          name: "Palantir Technologies",
          logo: "https://lever-client-logos.s3.us-west-2.amazonaws.com/logo.png",
        },
        jobLocation: { address: { addressLocality: "Palo Alto, CA" } },
        datePosted: "2026-05-12",
      }),
      body: `
        <a class="main-header-logo"><img alt="Palantir Technologies logo" src="https://lever-client-logos.s3.us-west-2.amazonaws.com/logo.png"></a>
        <div class="posting-headline"><h2>Administrative Business Partner - Security</h2></div>
      `,
    });

    expect(extractLeverListing()).toEqual({
      sourceUrl: "https://jobs.lever.co/palantir/0bbfd4f4-41ff-4ec6-b73f-5200efd5d4d3",
      companyName: "Palantir Technologies",
      jobTitle: "Administrative Business Partner - Security",
      locationText: "Palo Alto, CA",
      salaryText: null,
      postedAt: "2026-05-12",
      companyLogoUrl: "https://lever-client-logos.s3.us-west-2.amazonaws.com/logo.png",
    });
  });

  it("falls back to the DOM (posting-headline/posting-categories/header logo) when there's no JSON-LD", () => {
    setPage({
      path: "/acme/abc123",
      body: `
        <a class="main-header-logo"><img alt="Acme Corp logo" src="https://example.com/acme-logo.png"></a>
        <div class="posting-headline">
          <h2>Staff Platform Engineer</h2>
          <div class="posting-categories">
            <div class="posting-category location">Remote, US</div>
            <div class="posting-category department">Engineering /</div>
          </div>
        </div>
      `,
    });

    expect(extractLeverListing()).toEqual({
      sourceUrl: "https://jobs.lever.co/acme/abc123",
      companyName: "Acme Corp",
      jobTitle: "Staff Platform Engineer",
      locationText: "Remote, US",
      salaryText: null,
      postedAt: null,
      companyLogoUrl: "https://example.com/acme-logo.png",
    });
  });

  it("returns null when the company can't be determined", () => {
    setPage({
      path: "/acme/abc123",
      body: `<div class="posting-headline"><h2>Staff Platform Engineer</h2></div>`,
    });
    expect(extractLeverListing()).toBeNull();
  });

  it("never throws on a page with no posting markup at all", () => {
    setPage({ path: "/acme" });
    expect(() => extractLeverListing()).not.toThrow();
    expect(extractLeverListing()).toBeNull();
  });
});
