import jwt from "jsonwebtoken";
import { Principal } from "./Principal.js";

/**
 * The caller an Authorization header stands for, or null for an anonymous caller. A malformed,
 * forged or expired token is anonymous too: letting jwt.verify throw here rejected the auth
 * middleware's promise with nobody to catch it, and the Lambda container exited with
 * Runtime.UnhandledPromiseRejection (LessonsApi prod, 2026-10-18).
 */
export function principalFromAuthorizationHeader(authHeader: string | undefined, secret: string): Principal | null {
  if (!authHeader) return null;
  const token = authHeader.split(" ")[1];
  if (!token) return null;
  let decoded: string | jwt.JwtPayload;
  try {
    decoded = jwt.verify(token, secret, { algorithms: ["HS256"] });
  } catch {
    return null;
  }
  const result = decoded ? new Principal(typeof decoded === "object" && decoded !== null ? (decoded as Record<string, unknown>) : {}) : null;
  if (result) result.details.jwt = token;
  return result;
}
