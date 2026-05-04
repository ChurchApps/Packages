import { ApiHelper, ConnectionInterface } from "@churchapps/helpers";
import { SocketHelper } from "./SocketHelper";

/**
 * Tracks which conversation rooms the current tab has joined.
 * Backed by a single WebSocket (SocketHelper) and the server's /messaging/connections endpoint.
 *
 * - joinRoom: ref-counted POST /connections
 * - leaveRoom: decrements ref; DELETE /connections/:churchId/:conversationId/:socketId at zero
 * - rejoinAll: re-issues every active POST after a socket reconnect
 */
export class SubscriptionManager {
  private static counts: Map<string, number> = new Map();
  private static rejoinHandlerRegistered = false;

  static setupRejoin = () => {
    if (SubscriptionManager.rejoinHandlerRegistered) return;
    SubscriptionManager.rejoinHandlerRegistered = true;
    SocketHelper.addHandler("reconnect", "SubscriptionManager-Rejoin", () => {
      SubscriptionManager.rejoinAll();
    });
    // Components may call joinRoom while the socket is still mid-handshake (no socketId yet).
    // We record the intent in `counts`; this listener flushes those pending joins to the server
    // as soon as socketId arrives.
    SocketHelper.onSocketIdReady(() => {
      SubscriptionManager.rejoinAll();
    });
    // setupRejoin is called from NotificationService.runInitialize *after* SocketHelper.init
    // completes — so socketId may already be present by the time we register the listener.
    // In that case there's no future socketId event to wait for; flush any pending joins now.
    if (SocketHelper.socketId) {
      SubscriptionManager.rejoinAll().catch(() => { /* ignore */ });
    }
  };

  static joinRoom = async (conversationId: string, churchId: string, personId?: string, displayName?: string) => {
    const key = SubscriptionManager.key(churchId, conversationId);
    const next = (SubscriptionManager.counts.get(key) ?? 0) + 1;
    SubscriptionManager.counts.set(key, next);
    if (next > 1) return; // already joined
    SubscriptionManager.setupRejoin();
    await SubscriptionManager.postConnection(conversationId, churchId, personId, displayName);
  };

  // Debounced DELETE: when count hits zero, schedule the server-side leave a short
  // delay later. If joinRoom comes back within that window (React StrictMode dev
  // mount/cleanup/mount, or a useEffect dep update that immediately re-mounts), the
  // pending DELETE is canceled and the server-side row is preserved — preventing the
  // race where the inbound broadcast lands between DELETE and the next POST and
  // finds an empty room.
  private static pendingLeaves: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private static LEAVE_DEBOUNCE_MS = 300;

  static leaveRoom = async (conversationId: string, churchId: string) => {
    const key = SubscriptionManager.key(churchId, conversationId);
    const current = SubscriptionManager.counts.get(key) ?? 0;
    if (current <= 0) return;
    const next = current - 1;
    if (next > 0) {
      SubscriptionManager.counts.set(key, next);
      return;
    }
    SubscriptionManager.counts.delete(key);
    // Debounce the actual DELETE — see comment above.
    const existing = SubscriptionManager.pendingLeaves.get(key);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(async () => {
      SubscriptionManager.pendingLeaves.delete(key);
      // If something rejoined in the meantime, abort.
      if ((SubscriptionManager.counts.get(key) ?? 0) > 0) return;
      if (!SocketHelper.socketId) return;
      try {
        await ApiHelper.delete(`/connections/${churchId}/${conversationId}/${SocketHelper.socketId}`, "MessagingApi");
      } catch (err) {
        console.warn("SubscriptionManager.leaveRoom failed:", err);
      }
    }, SubscriptionManager.LEAVE_DEBOUNCE_MS);
    SubscriptionManager.pendingLeaves.set(key, timer);
  };

  static rejoinAll = async () => {
    if (!SocketHelper.socketId) return;
    const entries = Array.from(SubscriptionManager.counts.keys());
    await Promise.all(entries.map((key) => {
      const [churchId, conversationId] = key.split("|");
      return SubscriptionManager.postConnection(conversationId, churchId);
    }));
  };

  static reset = () => {
    SubscriptionManager.counts.clear();
  };

  static isJoined = (churchId: string, conversationId: string): boolean => {
    return (SubscriptionManager.counts.get(SubscriptionManager.key(churchId, conversationId)) ?? 0) > 0;
  };

  private static postConnection = async (conversationId: string, churchId: string, personId?: string, displayName?: string) => {
    if (!SocketHelper.socketId) return; // will retry on socketIdReady via setupRejoin
    const connection: ConnectionInterface = {
      conversationId,
      churchId,
      socketId: SocketHelper.socketId,
      personId: personId ?? null,
      displayName: displayName ?? ""
    };
    try {
      await ApiHelper.postAnonymous("/connections", [connection], "MessagingApi");
    } catch (err) {
      console.warn(`SubscriptionManager.postConnection(${conversationId}) failed:`, err);
    }
  };

  private static key = (churchId: string, conversationId: string) => `${churchId}|${conversationId}`;
}
