import type { Request, RequestHandler, Response } from "express";
import { WebhookVerifier } from "./WebhookVerifier";
import { B1WebhookEnvelope, WEBHOOK_HEADERS } from "../types";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** The untouched request body — set by `express.json({ verify })`. */
      rawBody?: Buffer | string;
      /** The verified, parsed webhook envelope — set by `b1WebhookMiddleware`. */
      b1Webhook?: B1WebhookEnvelope;
    }
  }
}

export interface B1WebhookMiddlewareOptions {
  /** The webhook secret, or a function resolving one per request. */
  secret: string | ((req: Request) => string);
  /** Called instead of the default 401 response when verification fails. */
  onInvalid?: (req: Request, res: Response) => void;
}

/**
 * Express middleware that verifies the `X-B1-Signature` header and attaches a
 * typed `req.b1Webhook` envelope.
 *
 * The raw request body must be available — capture it before JSON parsing:
 *
 * ```ts
 * app.use(express.json({ verify: (req, _res, buf) => { (req as any).rawBody = buf; } }));
 * app.post("/webhooks/b1", b1WebhookMiddleware({ secret }), (req, res) => {
 *   console.log(req.b1Webhook?.event);
 *   res.sendStatus(200);
 * });
 * ```
 *
 * `express.raw({ type: "application/json" })` is also accepted — `req.body` is
 * then a Buffer the middleware verifies and parses itself.
 */
export function b1WebhookMiddleware(options: B1WebhookMiddlewareOptions): RequestHandler {
  return (req: Request, res: Response, next): void => {
    const raw = resolveRawBody(req);
    if (raw === undefined) {
      throw new Error(
        "b1WebhookMiddleware: no raw request body found. Mount " +
        "express.json({ verify: (req, _res, buf) => { req.rawBody = buf; } }) " +
        "or express.raw({ type: \"application/json\" }) before this middleware."
      );
    }

    const secret = typeof options.secret === "function" ? options.secret(req) : options.secret;
    const signature = req.header(WEBHOOK_HEADERS.signature);

    if (!WebhookVerifier.verify(secret, raw, signature)) {
      if (options.onInvalid) options.onInvalid(req, res);
      else res.status(401).json({ error: "invalid webhook signature" });
      return;
    }

    const envelope = WebhookVerifier.parseEnvelope(raw);
    req.b1Webhook = envelope;
    if (Buffer.isBuffer(req.body)) req.body = envelope;
    next();
  };
}

function resolveRawBody(req: Request): Buffer | string | undefined {
  if (req.rawBody !== undefined) return req.rawBody;
  if (Buffer.isBuffer(req.body)) return req.body;
  return undefined;
}
