import { afterEach, describe, expect, it } from "vitest";
import { extractGreenhouseListing } from "./greenhouse-selectors";

function setPage({
  path,
  head = "",
  remixContext,
}: {
  path: string;
  head?: string;
  remixContext?: unknown;
}): void {
  const url = new URL(path, "https://job-boards.greenhouse.io");
  Object.defineProperty(window, "location", {
    value: { href: url.href, pathname: url.pathname, search: url.search, hash: url.hash },
    writable: true,
    configurable: true,
  });
  document.head.innerHTML = head;
  document.title = "";
  if (remixContext !== undefined) {
    (window as unknown as { __remixContext?: unknown }).__remixContext = remixContext;
  } else {
    delete (window as unknown as { __remixContext?: unknown }).__remixContext;
  }
}

// Shape verified live against job-boards.greenhouse.io/gitlab and /anthropic postings.
function fakeRemixContext(jobPost: Record<string, unknown>, logoUrl = "https://example.com/logo.png") {
  return {
    state: {
      loaderData: {
        root: { boardConfiguration: { logo: { url: logoUrl } } },
        "routes/$url_token_.jobs_.$job_post_id": { jobPost },
      },
    },
  };
}

describe("extractGreenhouseListing", () => {
  afterEach(() => {
    delete (window as unknown as { __remixContext?: unknown }).__remixContext;
  });

  it("extracts from the remixContext loader data (current Greenhouse template)", () => {
    setPage({
      path: "/gitlab/jobs/8432221002",
      remixContext: fakeRemixContext({
        title: "Senior Backend Engineer (RoR/Go), SSCS: Pipeline Security",
        company_name: "GitLab",
        job_post_location: "Remote, Canada; Remote, Israel; Remote, United Kingdom; Remote, US",
        published_at: "2026-03-10T20:59:34-04:00",
        pay_ranges: [{ min: "$117,600", max: "$252,000" }],
      }),
    });

    expect(extractGreenhouseListing()).toEqual({
      sourceUrl: "https://job-boards.greenhouse.io/gitlab/jobs/8432221002",
      companyName: "GitLab",
      jobTitle: "Senior Backend Engineer (RoR/Go), SSCS: Pipeline Security",
      locationText: "Remote, Canada; Remote, Israel; Remote, United Kingdom; Remote, US",
      salaryText: "$117,600 - $252,000",
      postedAt: "2026-03-10T20:59:34-04:00",
      companyLogoUrl: "https://example.com/logo.png",
    });
  });

  it("falls back to the <title> tag and og:description when there's no remixContext", () => {
    setPage({
      path: "/anthropic/jobs/5023394008",
      head: '<meta property="og:description" content="London, UK; Remote-Friendly, United States">',
    });
    document.title = "Job Application for Anthropic Fellows Program at Anthropic";

    const listing = extractGreenhouseListing();
    expect(listing?.jobTitle).toBe("Anthropic Fellows Program");
    expect(listing?.companyName).toBe("Anthropic");
    expect(listing?.locationText).toBe("London, UK; Remote-Friendly, United States");
    expect(listing?.salaryText).toBeNull();
  });

  it("returns null when neither source yields a title/company", () => {
    setPage({ path: "/example/jobs/1" });
    document.title = "Careers";
    expect(extractGreenhouseListing()).toBeNull();
  });

  it("never throws on a malformed remixContext blob", () => {
    setPage({ path: "/example/jobs/1", remixContext: { state: "not-an-object" } });
    expect(() => extractGreenhouseListing()).not.toThrow();
  });
});
