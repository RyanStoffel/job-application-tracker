import { beforeEach, describe, expect, it } from "vitest";
import {
  extractListingFromPage,
  extractLocationFromMetaLine,
  findAlternateSduiParagraph,
  findSalaryBubbleText,
  splitCombinedTitle,
} from "./selectors";

function setPage({
  path = "/jobs/view/12345/",
  head = "",
  body = "",
}: {
  path?: string;
  head?: string;
  body?: string;
}): void {
  const url = new URL(path, "https://www.linkedin.com");
  Object.defineProperty(window, "location", {
    value: { href: url.href, pathname: url.pathname, search: url.search, hash: url.hash },
    writable: true,
    configurable: true,
  });
  document.head.innerHTML = head;
  document.body.innerHTML = body;
}

const SDUI_ATTR = 'data-sdui-screen="com.linkedin.sdui.flagshipnav.jobs.JobDetails"';

describe("splitCombinedTitle", () => {
  it("splits LinkedIn's '{title} hiring at {company}' pattern", () => {
    expect(splitCombinedTitle("Backend Engineer hiring at Acme Corp | LinkedIn")).toEqual({
      title: "Backend Engineer",
      company: "Acme Corp",
    });
  });

  it("returns nulls when neither pattern matches", () => {
    expect(splitCombinedTitle("Just a plain page title")).toEqual({ title: null, company: null });
  });
});

describe("findAlternateSduiParagraph", () => {
  it("returns the first paragraph in the scope whose text differs from the excluded text", () => {
    document.body.innerHTML = `
      <div ${SDUI_ATTR}>
        <p>Amazon</p>
        <p>Senior Software Engineer</p>
      </div>
    `;
    expect(findAlternateSduiParagraph(document, "Amazon")).toBe("Senior Software Engineer");
  });

  it("returns null when every paragraph matches the excluded text", () => {
    document.body.innerHTML = `<div ${SDUI_ATTR}><p>Amazon</p></div>`;
    expect(findAlternateSduiParagraph(document, "Amazon")).toBeNull();
  });
});

describe("extractLocationFromMetaLine", () => {
  it("picks the segment that isn't a relative-time/applicant-count/promoted string", () => {
    document.body.innerHTML = `
      <div ${SDUI_ATTR}>
        <p><span>Salt Lake City Metropolitan Area</span><span>6 days ago</span><span>Over 100 people clicked apply</span></p>
      </div>
    `;
    expect(extractLocationFromMetaLine(document)).toBe("Salt Lake City Metropolitan Area");
  });

  it("returns null when there's no multi-segment metadata line", () => {
    document.body.innerHTML = `<div ${SDUI_ATTR}><p><span>Just one segment</span></p></div>`;
    expect(extractLocationFromMetaLine(document)).toBeNull();
  });
});

describe("findSalaryBubbleText", () => {
  it("finds a short currency-amount span near the top card", () => {
    document.body.innerHTML = `
      <div ${SDUI_ATTR}>
        <span>On-site</span>
        <span>$25/hr - $25/hr</span>
      </div>
    `;
    expect(findSalaryBubbleText(document)).toBe("$25/hr - $25/hr");
  });

  it("ignores long body text even if it contains a currency amount", () => {
    document.body.innerHTML = `
      <div ${SDUI_ATTR}>
        <span>${"About the role. ".repeat(10)}Pay starts at $1</span>
      </div>
    `;
    expect(findSalaryBubbleText(document)).toBeNull();
  });
});

describe("extractListingFromPage", () => {
  beforeEach(() => setPage({}));

  it("prefers JSON-LD for title/company/location/salary/logo when present", () => {
    setPage({
      path: "/jobs/view/12345/",
      head: `<script type="application/ld+json">${JSON.stringify({
        "@type": "JobPosting",
        title: "Platform Engineer",
        hiringOrganization: { name: "Gamma LLC", logo: "https://example.com/logo.png" },
        jobLocation: { address: { addressLocality: "New York", addressRegion: "NY" } },
        baseSalary: { currency: "USD", value: { minValue: 140000, maxValue: 180000, unitText: "YEAR" } },
        datePosted: "2026-05-01",
      })}</script>`,
    });

    const listing = extractListingFromPage();
    expect(listing).toEqual({
      sourceUrl: "https://www.linkedin.com/jobs/view/12345/",
      companyName: "Gamma LLC",
      jobTitle: "Platform Engineer",
      locationText: "New York, NY",
      salaryText: "USD 140000-180000/year",
      postedAt: "2026-05-01",
      companyLogoUrl: "https://example.com/logo.png",
    });
  });

  it("falls back to the SDUI DOM scope and canonical link when there's no JSON-LD", () => {
    setPage({
      path: "/jobs/view/99999/",
      head: `<link rel="canonical" href="https://www.linkedin.com/jobs/view/99999/?extra=1">`,
      body: `
        <div ${SDUI_ATTR}>
          <p>Senior Backend Engineer</p>
          <a href="/company/omega-systems/">Omega Systems</a>
        </div>
      `,
    });

    const listing = extractListingFromPage();
    expect(listing?.jobTitle).toBe("Senior Backend Engineer");
    expect(listing?.companyName).toBe("Omega Systems");
    expect(listing?.sourceUrl).toBe("https://www.linkedin.com/jobs/view/99999/");
  });

  it("recovers from a title/company collision by finding an alternate paragraph", () => {
    setPage({
      path: "/jobs/view/55555/",
      body: `
        <div ${SDUI_ATTR}>
          <p>Amazon</p>
          <a href="/company/amazon/">Amazon</a>
          <p>Software Development Engineer</p>
        </div>
      `,
    });

    const listing = extractListingFromPage();
    expect(listing?.companyName).toBe("Amazon");
    expect(listing?.jobTitle).toBe("Software Development Engineer");
  });

  it("returns null when title or company can't be determined", () => {
    setPage({ path: "/jobs/view/1/", body: "<p>Nothing useful here</p>" });
    expect(extractListingFromPage()).toBeNull();
  });
});
