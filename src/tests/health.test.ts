import { describe, expect, it } from "vitest";
import { buildApp } from "../app.js";

describe("Health API", () => {
  it("returns 200 ok and counts for anime, manga, and characters", async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: "GET",
      url: "/health"
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.ok).toBe(true);
    expect(body.service).toBe("otakudb-api");
    expect(body.counts).toBeDefined();
    expect(typeof body.counts.anime).toBe("number");
    expect(typeof body.counts.manga).toBe("number");
    expect(typeof body.counts.characters).toBe("number");
    await app.close();
  });
});
