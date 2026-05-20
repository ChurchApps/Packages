import crypto from "crypto";
import { B1WebhookEnvelope } from "../types";

/** Thrown by `verifyAndParse` when a signature does not match. */
export class WebhookVerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WebhookVerificationError";
  }
}

/**
 * Verifies and parses inbound B1 webhook deliveries.
 *
 * The signature is an HMAC-SHA256 over the **raw request body** — verify
 * before any JSON parse/re-stringify, which would change byte order/whitespace.
 * Byte-compatible with the B1 Api `shared/webhooks/WebhookSigner.ts`.
 */
export class WebhookVerifier {
  /** Computes the `X-B1-Signature` value for a raw body. */
  static sign(secret: string, rawBody: string | Buffer): string {
    const body = typeof rawBody === "string" ? rawBody : rawBody.toString("utf8");
    return "sha256=" + crypto.createHmac("sha256", secret).update(body, "utf8").digest("hex");
  }

  /**
   * Returns `true` when `signatureHeader` matches the body. Never throws —
   * a missing, empty, or malformed header simply returns `false`.
   */
  static verify(secret: string, rawBody: string | Buffer, signatureHeader: string | null | undefined): boolean {
    if (!signatureHeader) return false;
    const expected = WebhookVerifier.sign(secret, rawBody);
    const a = Buffer.from(signatureHeader, "utf8");
    const b = Buffer.from(expected, "utf8");
    // timingSafeEqual throws on length mismatch — guard, but still do a
    // constant-time compare against `expected` so timing stays flat.
    if (a.length !== b.length) {
      crypto.timingSafeEqual(b, b);
      return false;
    }
    return crypto.timingSafeEqual(a, b);
  }

  /** Parses a raw body into a typed envelope (no verification). */
  static parseEnvelope<T = unknown>(rawBody: string | Buffer): B1WebhookEnvelope<T> {
    const body = typeof rawBody === "string" ? rawBody : rawBody.toString("utf8");
    return JSON.parse(body) as B1WebhookEnvelope<T>;
  }

  /**
   * Verifies the signature, then parses the body into a typed envelope.
   * Throws `WebhookVerificationError` if the signature does not match.
   */
  static verifyAndParse<T = unknown>(
    secret: string,
    rawBody: string | Buffer,
    signatureHeader: string | null | undefined
  ): B1WebhookEnvelope<T> {
    if (!WebhookVerifier.verify(secret, rawBody, signatureHeader)) {
      throw new WebhookVerificationError("Webhook signature verification failed");
    }
    return WebhookVerifier.parseEnvelope<T>(rawBody);
  }
}
