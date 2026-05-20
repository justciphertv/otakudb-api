import { describe, expect, it } from "vitest";
import { schema } from "../graphql/schema.js";

describe("GraphQL schema", () => {
  it("contains core operations", () => {
    const query = schema.getQueryType()?.getFields() ?? {};
    const mutation = schema.getMutationType()?.getFields() ?? {};
    const mediaSort = schema.getType("MediaSort")?.toString();
    expect(query.Page).toBeDefined();
    expect(query.Media).toBeDefined();
    expect(mutation.RegisterUser).toBeDefined();
    expect(mutation.SaveMediaListEntry).toBeDefined();
    expect(mutation.AdminCreateMedia).toBeDefined();
    expect(mediaSort).toBe("MediaSort");
  });
});
