// Built-in providers are wired up directly inside registry.ts (so bundlers can't
// drop the registration). Add a new built-in there; or call registerPaymentProvider
// at runtime for a host-app gateway.
export * from "./types";
export * from "./registry";
