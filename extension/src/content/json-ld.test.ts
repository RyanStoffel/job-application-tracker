import { beforeEach, describe, expect, it } from "vitest";
import { formatSalaryFromJsonLd, readJsonLdJobPosting, readJsonLdLogoUrl } from "./json-ld";

function setJsonLdScripts(bodies: string[]): void {
  document.head.innerHTML = "";
  for (const body of bodies) {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.textContent = body;
    document.head.appendChild(script);
  }
}

describe("readJsonLdJobPosting", () => {
  beforeEach(() => setJsonLdScripts([]));

  it("returns null when no JSON-LD scripts are present", () => {
    expect(readJsonLdJobPosting()).toBeNull();
  });

  it("finds a top-level JobPosting object", () => {
    setJsonLdScripts([JSON.stringify({ "@type": "JobPosting", title: "Engineer" })]);
    expect(readJsonLdJobPosting()?.title).toBe("Engineer");
  });

  it("finds a JobPosting inside a top-level array", () => {
    setJsonLdScripts([
      JSON.stringify([{ "@type": "Organization" }, { "@type": "JobPosting", title: "Designer" }]),
    ]);
    expect(readJsonLdJobPosting()?.title).toBe("Designer");
  });

  it("finds a JobPosting nested under @graph", () => {
    setJsonLdScripts([
      JSON.stringify({
        "@graph": [{ "@type": "WebPage" }, { "@type": "JobPosting", title: "Nested Role" }],
      }),
    ]);
    expect(readJsonLdJobPosting()?.title).toBe("Nested Role");
  });

  it("skips malformed JSON without throwing and keeps checking later scripts", () => {
    setJsonLdScripts(["{not valid json", JSON.stringify({ "@type": "JobPosting", title: "Recovered" })]);
    expect(readJsonLdJobPosting()?.title).toBe("Recovered");
  });

  it("returns null when no script contains a JobPosting", () => {
    setJsonLdScripts([JSON.stringify({ "@type": "Organization" })]);
    expect(readJsonLdJobPosting()).toBeNull();
  });
});

describe("formatSalaryFromJsonLd", () => {
  it("returns null when baseSalary/value is absent", () => {
    expect(formatSalaryFromJsonLd(undefined)).toBeNull();
    expect(formatSalaryFromJsonLd({})).toBeNull();
  });

  it("formats a min/max range with currency and unit", () => {
    const result = formatSalaryFromJsonLd({
      currency: "USD",
      value: { minValue: 140000, maxValue: 180000, unitText: "YEAR" },
    });
    expect(result).toBe("USD 140000-180000/year");
  });

  it("formats a single value without a currency", () => {
    const result = formatSalaryFromJsonLd({ value: { value: 50, unitText: "HOUR" } });
    expect(result).toBe("50/hour");
  });
});

describe("readJsonLdLogoUrl", () => {
  it("returns null for undefined input", () => {
    expect(readJsonLdLogoUrl(undefined)).toBeNull();
  });

  it("accepts a bare string URL", () => {
    expect(readJsonLdLogoUrl("https://example.com/logo.png")).toBe("https://example.com/logo.png");
  });

  it("extracts url from an ImageObject shape", () => {
    expect(readJsonLdLogoUrl({ url: "https://example.com/logo.png" })).toBe(
      "https://example.com/logo.png",
    );
  });

  it("returns null for an empty string or an object missing url", () => {
    expect(readJsonLdLogoUrl("")).toBeNull();
    expect(readJsonLdLogoUrl({})).toBeNull();
  });
});
