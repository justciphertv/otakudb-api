import { describe, expect, it } from "vitest";
import { sanitizeText, slugify } from "../common/sanitize.js";

describe("sanitization", () => {
  it("removes script content and dangerous protocols", () => {
    expect(sanitizeText('<script>alert(1)</script><a href="javascript:bad()">x</a>')).not.toContain("script");
    expect(sanitizeText("javascript:alert(1)")).toBe("alert(1)");
  });

  it("creates stable slugs", () => {
    expect(slugify("Skyline Chronicle 1!")).toBe("skyline-chronicle-1");
  });
});
