import { describe, expect, it } from "vitest";
import { normalizePage, pageInfo } from "../common/pagination.js";

describe("pagination", () => {
  it("rejects perPage above 50", () => {
    expect(() => normalizePage({ page: 1, perPage: 51 })).toThrow("perPage cannot exceed 50");
  });

  it("computes PageInfo", () => {
    expect(pageInfo(101, 2, 50)).toEqual({
      currentPage: 2,
      perPage: 50,
      total: 101,
      lastPage: 3,
      hasNextPage: true
    });
  });
});
