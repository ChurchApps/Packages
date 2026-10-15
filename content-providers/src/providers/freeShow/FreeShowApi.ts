import { NetworkInstance } from "../../interfaces";
import { detectMediaType, isMediaFile } from "../../utils";

// FreeShow serves REST on its API port + 1; the API port defaults to 5505.
export const FREESHOW_REST_PORT = 5506;

export async function freeShowRequest<T>(instance: Pick<NetworkInstance, "ip" | "port">, action: string, data: Record<string, unknown> = {}, timeoutMs = 15000): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`http://${instance.ip}:${instance.port}/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...data }),
      signal: controller.signal
    });
    if (res.status === 204) return null;
    if (!res.ok) throw new Error(`FreeShow ${action} failed (${res.status})`);
    const json = await res.json();
    if (json?.action !== action) throw new Error("Not a FreeShow response");
    return (json.data ?? null) as T | null;
  } finally {
    clearTimeout(timer);
  }
}

export interface MdnsService {
  name: string;
  host?: string | null;
  txt?: Record<string, string>;
}

const isLanIp = (ip?: string | null): ip is string => !!ip && /^\d{1,3}(\.\d{1,3}){3}$/.test(ip) && !ip.startsWith("127.") && !ip.startsWith("169.254.");

function firstAnswering(ips: string[], port: number): Promise<string | null> {
  return new Promise(resolve => {
    let pending = ips.length;
    ips.forEach(ip => freeShowRequest({ ip, port }, "get_projects", {}, 2000).then(() => resolve(ip), () => { if (--pending === 0) resolve(null); }));
  });
}

/**
 * FreeShow advertises its Remote/Stage/etc. servers (not its API) as `_freeshow._udp`, named `freeshow-<SERVER>-<instanceId>`,
 * with TXT `ip` and `ips` (comma-joined). Group by machine and pick the address that answers the REST API.
 */
export async function servicesToInstances(services: MdnsService[], port = FREESHOW_REST_PORT): Promise<NetworkInstance[]> {
  const machines = new Map<string, string[]>();
  for (const service of services) {
    const id = service.name.split("-").pop() || service.name;
    const candidates = [service.txt?.ip, ...(service.txt?.ips || "").split(","), service.host].filter(isLanIp);
    machines.set(id, [...new Set([...(machines.get(id) || []), ...candidates])]);
  }
  const instances = await Promise.all([...machines].filter(([, ips]) => ips.length > 0).map(async ([id, ips]) => {
    // API off still lists the machine; browsing fails until WebSocket/REST is turned on
    const ip = await firstAnswering(ips, port) || ips[0];
    return { id, name: `FreeShow (${ip})`, host: ip, ip, port };
  }));
  return instances.sort((a, b) => a.ip.localeCompare(b.ip, undefined, { numeric: true }));
}

/** Online media plays as-is; local images stream through get_thumbnail (a full-size data URL). FreeShow's API can't serve local video/audio. */
export function freeShowMediaUrl(instance: Pick<NetworkInstance, "ip" | "port">, path: string, explicitType?: string): string | null {
  if (/^https?:\/\//i.test(path)) return path;
  if (!isMediaFile(path) || detectMediaType(path, explicitType) !== "image") return null;
  return `http://${instance.ip}:${instance.port}/?action=get_thumbnail&data=${encodeURIComponent(JSON.stringify({ path }))}`;
}
