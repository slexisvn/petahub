import { describe, expect, it } from "vitest";
import { formatBytes, formatRelative } from "../../src/lib/format";

describe("formatBytes", () => {
  it("keeps small archives in whole bytes", () => {
    expect(formatBytes(940)).toBe("940 B");
  });

  it("steps up a unit at the 1024 boundary rather than 1000", () => {
    expect(formatBytes(1000)).toBe("1000 B");
    expect(formatBytes(1024)).toBe("1.0 KB");
  });

  it("drops the fraction once the number is large enough to not need it", () => {
    expect(formatBytes(150 * 1024)).toBe("150 KB");
  });
});

describe("formatRelative", () => {
  const now = Date.parse("2026-08-14T12:00:00.000Z");

  it("describes the same day in hours", () => {
    expect(formatRelative("2026-08-14T09:00:00.000Z", now)).toBe("3 hours ago");
  });

  it("describes last week in days rather than seconds", () => {
    expect(formatRelative("2026-08-08T12:00:00.000Z", now)).toBe("6 days ago");
  });

  it("collapses anything under a minute to the present", () => {
    expect(formatRelative("2026-08-14T11:59:31.000Z", now)).toBe("29 seconds ago");
  });

  it("reads a year back as a year, not as months", () => {
    expect(formatRelative("2025-08-14T12:00:00.000Z", now)).toBe("last year");
  });
});
