import { describe, it, expect, vi } from "vitest";
import { B1OAuthClient, B1OAuthError } from "./B1OAuthClient";

const TOKEN = { access_token: "jwt", token_type: "Bearer", expires_in: 604800, refresh_token: "rt", scope: "people:read" };

function resp(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("B1OAuthClient.exchangeCode", () => {
  it("posts grant_type=authorization_code and returns the token", async () => {
    const fetchMock = vi.fn(async () => resp(TOKEN));
    const client = new B1OAuthClient({ clientId: "c1", clientSecret: "s1", fetch: fetchMock as any });
    const token = await client.exchangeCode({ code: "abc", redirectUri: "https://app.test/cb" });

    expect(token.access_token).toBe("jwt");
    const body = JSON.parse((fetchMock.mock.calls[0][1] as any).body);
    expect(body.grant_type).toBe("authorization_code");
    expect(body.code).toBe("abc");
    expect(body.client_secret).toBe("s1");
  });
});

describe("B1OAuthClient.refresh", () => {
  it("posts grant_type=refresh_token without requiring a client secret", async () => {
    const fetchMock = vi.fn(async () => resp(TOKEN));
    const client = new B1OAuthClient({ clientId: "c1", fetch: fetchMock as any });
    await client.refresh("my-refresh-token");

    const body = JSON.parse((fetchMock.mock.calls[0][1] as any).body);
    expect(body.grant_type).toBe("refresh_token");
    expect(body.refresh_token).toBe("my-refresh-token");
    expect(body.client_secret).toBeUndefined();
  });
});

describe("B1OAuthClient.startDeviceFlow", () => {
  it("returns the device authorization response", async () => {
    const device = { device_code: "dc", user_code: "WXYZ-1234", verification_uri: "https://b1.church/device", expires_in: 900, interval: 5 };
    const fetchMock = vi.fn(async () => resp(device));
    const client = new B1OAuthClient({ clientId: "c1", fetch: fetchMock as any });
    const result = await client.startDeviceFlow(["people:read"]);
    expect(result.user_code).toBe("WXYZ-1234");
  });
});

describe("B1OAuthClient.pollDeviceToken", () => {
  it("maps authorization_pending to a pending result (no throw)", async () => {
    const fetchMock = vi.fn(async () => resp({ error: "authorization_pending" }, 400));
    const client = new B1OAuthClient({ clientId: "c1", fetch: fetchMock as any });
    expect(await client.pollDeviceToken("dc")).toEqual({ status: "pending" });
  });

  it("returns an approved result with the token", async () => {
    const fetchMock = vi.fn(async () => resp(TOKEN));
    const client = new B1OAuthClient({ clientId: "c1", fetch: fetchMock as any });
    const result = await client.pollDeviceToken("dc");
    expect(result.status).toBe("approved");
    if (result.status === "approved") expect(result.token.access_token).toBe("jwt");
  });
});

describe("B1OAuthClient error handling", () => {
  it("throws B1OAuthError when the token endpoint returns an error", async () => {
    const fetchMock = vi.fn(async () => resp({ error: "invalid_grant", error_description: "code expired" }, 400));
    const client = new B1OAuthClient({ clientId: "c1", clientSecret: "s1", fetch: fetchMock as any });
    const err = await client.exchangeCode({ code: "bad" }).catch((e) => e);
    expect(err).toBeInstanceOf(B1OAuthError);
    expect((err as B1OAuthError).error).toBe("invalid_grant");
  });
});
