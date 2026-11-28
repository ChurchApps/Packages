import { ContentProviderAuthData, NetworkInstance } from "../interfaces";

export interface MdnsService {
  name: string;
  host?: string | null;
  port?: number;
  txt?: Record<string, string>;
}

export type MdnsScanner = (serviceType: string) => Promise<MdnsService[]>;
export type NetworkDiscoverer = () => Promise<NetworkInstance[]>;

export interface NetworkProbeConfig {
  method?: "GET" | "POST";
  path?: string;
  body?: Record<string, unknown>;
  /** JSON key/value pairs expected in a valid probe response. */
  expect?: Record<string, unknown>;
  timeoutMs?: number;
}

export interface NetworkDiscoveryConfig {
  /** mDNS / Bonjour service type to scan for (e.g. "_freeshow._udp"). */
  serviceType: string;
  /** Default TCP port for the provider's LAN API. */
  defaultPort: number;
  /** How to group multiple mDNS records per machine: "lastDashSegment" (default) or "name". */
  groupBy?: "lastDashSegment" | "name";
  /** Display name template supporting {ip}, {id}, {name}, {port}. Defaults to "{name} ({ip})". */
  nameTemplate?: string;
  /** Scope stored in the network auth record. Defaults to the provider id. */
  scope?: string;
  /** Optional HTTP probe to choose the reachable LAN IP when a host advertises multiple addresses. */
  probe?: NetworkProbeConfig;
}

let globalMdnsScanner: MdnsScanner | null = null;

/** Register a host-provided mDNS scanner once so any LAN provider (including remotely loaded ones) can discover instances automatically. */
export function setMdnsScanner(scanner: MdnsScanner | null): void {
  globalMdnsScanner = scanner;
}

export function getMdnsScanner(): MdnsScanner | null {
  return globalMdnsScanner;
}

const isLanIp = (ip?: string | null): ip is string => !!ip && /^\d{1,3}(\.\d{1,3}){3}$/.test(ip) && !ip.startsWith("127.") && !ip.startsWith("169.254.");

/** Probe a single LAN host/port to check if the provider's local server answers as expected. */
export async function probeLanHost(ip: string, port: number, probe: NetworkProbeConfig): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), probe.timeoutMs ?? 2000);
  try {
    const method = probe.method || (probe.body ? "POST" : "GET");
    const path = probe.path || "/";
    const headers: Record<string, string> = { Accept: "application/json" };
    let body: string | undefined;
    if (probe.body !== undefined) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(probe.body);
    }
    const res = await fetch(`http://${ip}:${port}${path}`, { method, headers, ...(body !== undefined ? { body } : {}), signal: controller.signal });
    if (res.status === 204) return !probe.expect;
    if (!res.ok) return false;
    if (!probe.expect) return true;
    const json = await res.json().catch(() => null);
    if (!json || typeof json !== "object") return false;
    return Object.entries(probe.expect).every(([k, v]) => (json as Record<string, unknown>)[k] === v);
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

function firstAnswering(ips: string[], port: number, probe: NetworkProbeConfig): Promise<string | null> {
  return new Promise(resolve => {
    let pending = ips.length;
    let settled = false;
    ips.forEach(ip => {
      probeLanHost(ip, port, probe).then(ok => {
        if (settled) return;
        if (ok) {
          settled = true;
          resolve(ip);
        } else if (--pending === 0) {
          resolve(null);
        }
      });
    });
  });
}

function formatInstanceName(template: string, vars: { name: string; ip: string; id: string; port: number }): string {
  return template
    .replace(/\{name\}/g, vars.name)
    .replace(/\{ip\}/g, vars.ip)
    .replace(/\{id\}/g, vars.id)
    .replace(/\{port\}/g, String(vars.port));
}

/**
 * Turn raw mDNS service records into deduplicated NetworkInstances using a provider's NetworkDiscoveryConfig.
 * Groups records per machine, filters to routable LAN IPs, probes candidates when configured, and sorts by IP.
 */
export async function resolveMdnsServices(
  services: MdnsService[],
  config: NetworkDiscoveryConfig,
  options?: { port?: number; providerName?: string }
): Promise<NetworkInstance[]> {
  const port = options?.port ?? config.defaultPort;
  const providerName = options?.providerName || config.scope || "Server";
  const groupBy = config.groupBy ?? "lastDashSegment";
  const nameTemplate = config.nameTemplate || "{name} ({ip})";

  const machines = new Map<string, string[]>();
  for (const service of services) {
    const id = groupBy === "name" ? service.name : service.name.split("-").pop() || service.name;
    const candidates = [service.txt?.ip, ...(service.txt?.ips || "").split(","), service.host].filter(isLanIp);
    machines.set(id, [...new Set([...(machines.get(id) || []), ...candidates])]);
  }

  const instances = await Promise.all([...machines].filter(([, ips]) => ips.length > 0).map(async ([id, ips]) => {
    const ip = (config.probe ? await firstAnswering(ips, port, config.probe) : null) || ips[0];
    return { id, name: formatInstanceName(nameTemplate, { name: providerName, ip, id, port }), host: ip, ip, port };
  }));

  return instances.sort((a, b) => a.ip.localeCompare(b.ip, undefined, { numeric: true }));
}

export function networkInstanceToAuth(instance: NetworkInstance, scope = "network"): ContentProviderAuthData {
  return {
    access_token: instance.id,
    refresh_token: JSON.stringify(instance),
    token_type: "network",
    created_at: Math.floor(Date.now() / 1000),
    expires_in: 10 * 365 * 24 * 3600,
    scope
  };
}

export function authToNetworkInstance(auth?: ContentProviderAuthData | null): NetworkInstance | null {
  if (!auth?.refresh_token) return null;
  try {
    const parsed = JSON.parse(auth.refresh_token) as NetworkInstance;
    if (parsed?.id && parsed?.name) return parsed;
  } catch {
    return null;
  }
  return null;
}
