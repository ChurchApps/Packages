// Secrets are supplied by the host app at startup so they are never baked into the published bundle.
const secrets: Record<string, string> = {};

export const setProviderSecret = (providerId: string, secret: string): void => {
  secrets[providerId] = secret;
};

export const getProviderSecret = (providerId: string): string => secrets[providerId] || "";
