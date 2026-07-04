import { beforeEach, describe, expect, it } from "vitest";
import { extractWorkdayListing } from "./workday-selectors";

function setPage({
  path,
  head = "",
  body = "",
}: {
  path: string;
  head?: string;
  body?: string;
}): void {
  const url = new URL(path, "https://acme.wd1.myworkdayjobs.com");
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

describe("extractWorkdayListing", () => {
  beforeEach(() => setPage({ path: "/en-US/acmeCareers/job/Remote/Staff-Engineer_R12345" }));

  it("prefers JSON-LD when a tenant happens to embed it", () => {
    setPage({
      path: "/en-US/acmeCareers/job/Remote/Staff-Engineer_R12345",
      head: jobPostingScript({
        "@type": "JobPosting",
        title: "Staff Engineer",
        hiringOrganization: { name: "Acme Corp", logo: "https://example.com/logo.png" },
        jobLocation: { address: { addressLocality: "Remote" } },
        datePosted: "2026-04-01",
      }),
    });

    expect(extractWorkdayListing()).toEqual({
      sourceUrl: "https://acme.wd1.myworkdayjobs.com/en-US/acmeCareers/job/Remote/Staff-Engineer_R12345",
      companyName: "Acme Corp",
      jobTitle: "Staff Engineer",
      locationText: "Remote",
      salaryText: null,
      postedAt: "2026-04-01",
      companyLogoUrl: "https://example.com/logo.png",
    });
  });

  it("falls back to data-automation-id DOM attributes and never trusts postedOn as a date", () => {
    setPage({
      path: "/en-US/acmeCareers/job/Remote/Staff-Engineer_R12345",
      head: '<meta property="og:site_name" content="Acme Corp">',
      body: `
        <header><img alt="Acme Corp" src="https://example.com/logo.png"></header>
        <div data-automation-id="jobPostingHeader">Staff Engineer</div>
        <div data-automation-id="locations">Remote - US</div>
        <div data-automation-id="postedOn">Posted 30+ Days Ago</div>
      `,
    });

    const listing = extractWorkdayListing();
    expect(listing?.jobTitle).toBe("Staff Engineer");
    expect(listing?.companyName).toBe("Acme Corp");
    expect(listing?.locationText).toBe("Remote - US");
    // The only assertion that actually matters here: a relative "posted on" string
    // must never leak into postedAt, since the API would reject it and block the
    // whole capture (see the file header comment for why).
    expect(listing?.postedAt).toBeNull();
  });

  it("returns null when the company name can't be determined at all", () => {
    setPage({
      path: "/en-US/acmeCareers/job/Remote/Staff-Engineer_R12345",
      body: `<div data-automation-id="jobPostingHeader">Staff Engineer</div>`,
    });
    expect(extractWorkdayListing()).toBeNull();
  });

  it("never throws on the near-empty SPA shell before hydration", () => {
    setPage({ path: "/en-US/acmeCareers/job/Remote/Staff-Engineer_R12345", body: '<div id="root"></div>' });
    expect(() => extractWorkdayListing()).not.toThrow();
    expect(extractWorkdayListing()).toBeNull();
  });
});
