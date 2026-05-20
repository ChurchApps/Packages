import { describe, it, expect, vi } from "vitest";
import { B1RestClient } from "./B1RestClient";
import { B1ApiError } from "./B1ApiError";

const KEY = "cak_abcd1234.deadbeef";

function jsonResponse(body: unknown, init: { status?: number; statusText?: string } = {}): Response {
  return new Response(typeof body === "string" ? body : JSON.stringify(body), {
    status: init.status ?? 200,
    statusText: init.statusText ?? "OK",
    headers: { "Content-Type": "application/json" }
  });
}

describe("B1RestClient", () => {
  it("sends Authorization bearer + Accept headers", async () => {
    const fetchMock = vi.fn(async () => jsonResponse([{ id: "p1" }]));
    const client = new B1RestClient({ apiKey: KEY, fetch: fetchMock as any });
    await client.request("/membership/people");

    const [, init] = fetchMock.mock.calls[0];
    expect((init as any).headers.Authorization).toBe(`Bearer ${KEY}`);
    expect((init as any).headers.Accept).toBe("application/json");
  });

  it("builds the URL with module prefix and query params", async () => {
    const fetchMock = vi.fn(async () => jsonResponse([]));
    const client = new B1RestClient({ apiKey: KEY, baseUrl: "https://api.example.test", fetch: fetchMock as any });
    await client.membership("/people", { query: { search: "jane", limit: 10, skip: undefined } });

    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.example.test/membership/people?search=jane&limit=10");
  });

  it("returns parsed JSON on 200", async () => {
    const fetchMock = vi.fn(async () => jsonResponse([{ id: "p1" }]));
    const client = new B1RestClient({ apiKey: KEY, fetch: fetchMock as any });
    const people = await client.membership<{ id: string }[]>("/people");
    expect(people).toEqual([{ id: "p1" }]);
  });

  it("throws B1ApiError with status and body on a 403", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ message: "forbidden" }, { status: 403, statusText: "Forbidden" }));
    const client = new B1RestClient({ apiKey: KEY, fetch: fetchMock as any });
    await expect(client.giving("/donations", { method: "POST", body: {} })).rejects.toMatchObject({
      name: "B1ApiError",
      status: 403,
      body: { message: "forbidden" }
    });
  });

  it("wraps a network failure in B1ApiError (does not swallow it)", async () => {
    const fetchMock = vi.fn(async () => { throw new Error("ECONNREFUSED"); });
    const client = new B1RestClient({ apiKey: KEY, fetch: fetchMock as any });
    const err = await client.membership("/people").catch((e) => e);
    expect(err).toBeInstanceOf(B1ApiError);
    expect((err as B1ApiError).status).toBe(0);
  });

  it("resolves to undefined on a 204 empty body", async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 204, statusText: "No Content" }));
    const client = new B1RestClient({ apiKey: KEY, fetch: fetchMock as any });
    await expect(client.membership("/webhooks/abc", { method: "DELETE" })).resolves.toBeUndefined();
  });

  it("prefixes module wrapper paths correctly", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({}));
    const client = new B1RestClient({ apiKey: KEY, baseUrl: "https://api.example.test", fetch: fetchMock as any });
    await client.attendance("/visits");
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.example.test/attendance/visits");
  });
});
