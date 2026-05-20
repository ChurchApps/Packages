import { describe, it, expect, vi } from "vitest";
import { b1WebhookMiddleware } from "./expressMiddleware";
import { WebhookVerifier } from "./WebhookVerifier";

const SECRET = "test-secret-0123456789";
const BODY = JSON.stringify({ event: "donation.created", churchId: "ch1", occurredAt: "2026-05-19T00:00:00.000Z", data: { id: "d1", churchId: "ch1" } });

// Minimal Express-shaped fakes — enough for the middleware's surface.
function makeReq(opts: { rawBody?: Buffer | string; body?: unknown; signature?: string }): any {
  const headers: Record<string, string> = {};
  if (opts.signature !== undefined) headers["x-b1-signature"] = opts.signature;
  return {
    rawBody: opts.rawBody,
    body: opts.body,
    header: (name: string) => headers[name.toLowerCase()]
  };
}

function makeRes(): any {
  const res: any = { statusCode: 200, jsonBody: undefined };
  res.status = (code: number) => { res.statusCode = code; return res; };
  res.json = (b: unknown) => { res.jsonBody = b; return res; };
  return res;
}

describe("b1WebhookMiddleware", () => {
  it("calls next() and attaches req.b1Webhook for a valid signed request", () => {
    const sig = WebhookVerifier.sign(SECRET, BODY);
    const req = makeReq({ rawBody: Buffer.from(BODY, "utf8"), signature: sig });
    const res = makeRes();
    const next = vi.fn();

    b1WebhookMiddleware({ secret: SECRET })(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.b1Webhook?.event).toBe("donation.created");
  });

  it("responds 401 for a bad signature", () => {
    const req = makeReq({ rawBody: BODY, signature: "sha256=bad" });
    const res = makeRes();
    const next = vi.fn();

    b1WebhookMiddleware({ secret: SECRET })(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
  });

  it("throws a descriptive error when no raw body is available", () => {
    const req = makeReq({ body: { event: "x" }, signature: "sha256=bad" });
    const res = makeRes();
    expect(() => b1WebhookMiddleware({ secret: SECRET })(req, res, vi.fn())).toThrow(/raw request body/);
  });

  it("invokes a custom onInvalid handler instead of the default 401", () => {
    const req = makeReq({ rawBody: BODY, signature: "sha256=bad" });
    const res = makeRes();
    const onInvalid = vi.fn();

    b1WebhookMiddleware({ secret: SECRET, onInvalid })(req, res, vi.fn());

    expect(onInvalid).toHaveBeenCalledOnce();
    expect(res.statusCode).toBe(200);
  });
});
