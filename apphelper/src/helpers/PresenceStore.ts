import { SocketHelper } from "./SocketHelper";

export interface PresenceViewer { id?: string; displayName: string; personId?: string }
export interface PresenceSnapshot {
  conversationId: string;
  totalViewers: number;
  viewers: PresenceViewer[];
}

type Listener = (snapshot: PresenceSnapshot) => void;

/** In-memory cache of presence per conversation; socket handler registered once, rebroadcast on server join/leave so no polling needed */
export class PresenceStore {
  private static snapshots: Map<string, PresenceSnapshot> = new Map();
  private static listeners: Map<string, Set<Listener>> = new Map();
  private static handlersRegistered = false;

  static ensureHandlers = () => {
    if (PresenceStore.handlersRegistered) return;
    PresenceStore.handlersRegistered = true;

    SocketHelper.addHandler("attendance", "PresenceStore-Attendance", (data: any) => {
      const snapshot = PresenceStore.normalize(data);
      if (!snapshot) return;
      const existing = PresenceStore.snapshots.get(snapshot.conversationId);
      if (existing && PresenceStore.equals(existing, snapshot)) return;
      PresenceStore.snapshots.set(snapshot.conversationId, snapshot);
      PresenceStore.notify(snapshot.conversationId);
    });
  };

  static reset = () => {
    PresenceStore.snapshots.clear();
    PresenceStore.listeners.clear();
  };

  static get = (conversationId: string): PresenceSnapshot | null => {
    return PresenceStore.snapshots.get(conversationId) ?? null;
  };

  static subscribe = (conversationId: string, listener: Listener): (() => void) => {
    PresenceStore.ensureHandlers();
    let set = PresenceStore.listeners.get(conversationId);
    if (!set) {
      set = new Set();
      PresenceStore.listeners.set(conversationId, set);
    }
    set.add(listener);
    const cached = PresenceStore.snapshots.get(conversationId);
    if (cached) listener(cached);
    return () => {
      const s = PresenceStore.listeners.get(conversationId);
      if (!s) return;
      s.delete(listener);
      if (s.size === 0) PresenceStore.listeners.delete(conversationId);
    };
  };

  private static notify = (conversationId: string) => {
    const snapshot = PresenceStore.snapshots.get(conversationId);
    if (!snapshot) return;
    const set = PresenceStore.listeners.get(conversationId);
    set?.forEach(listener => {
      try { listener(snapshot); } catch (err) { console.error("PresenceStore listener error:", err); }
    });
  };

  private static normalize = (data: any): PresenceSnapshot | null => {
    if (!data?.conversationId) return null;
    const viewers: PresenceViewer[] = Array.isArray(data.viewers) ? data.viewers : [];
    const totalViewers = typeof data.totalViewers === "number" ? data.totalViewers : viewers.length;
    return { conversationId: data.conversationId, totalViewers, viewers };
  };

  private static equals = (a: PresenceSnapshot, b: PresenceSnapshot): boolean => {
    if (a.totalViewers !== b.totalViewers || a.viewers.length !== b.viewers.length) return false;
    for (let i = 0; i < a.viewers.length; i++) {
      const av = a.viewers[i];
      const bv = b.viewers[i];
      if (av.id !== bv.id || av.displayName !== bv.displayName || av.personId !== bv.personId) return false;
    }
    return true;
  };

  static forget = (conversationId: string): void => {
    PresenceStore.snapshots.delete(conversationId);
    PresenceStore.listeners.delete(conversationId);
  };
}
