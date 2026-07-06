import { ApiHelper, ConnectionInterface } from "@churchapps/helpers";
import { SocketHelper } from "./SocketHelper";

interface RoomState { count: number; personId?: string; displayName?: string; }

/** Tracks conversation room subscriptions via ref-counted WebSocket connections. */
export class SubscriptionManager {
  private static rooms: Map<string, RoomState> = new Map();
  private static rejoinHandlerRegistered = false;
  private static lastRejoinSocketId: string | null = null;

  static setupRejoin = () => {
    if (SubscriptionManager.rejoinHandlerRegistered) return;
    SubscriptionManager.rejoinHandlerRegistered = true;
    SocketHelper.addHandler("reconnect", "SubscriptionManager-Rejoin", () => {
      SubscriptionManager.rejoinAll();
    });
    // joinRoom calls may arrive before socketId is ready; flush when ready or if already present.
    SocketHelper.onSocketIdReady(() => {
      SubscriptionManager.rejoinAll();
    });
    if (SocketHelper.socketId) {
      SubscriptionManager.rejoinAll().catch(() => { /* ignore */ });
    }
  };

  static joinRoom = async (conversationId: string, churchId: string, personId?: string, displayName?: string) => {
    const key = SubscriptionManager.key(churchId, conversationId);
    const room = SubscriptionManager.rooms.get(key) ?? { count: 0 };
    room.count++;
    if (personId) room.personId = personId;
    if (displayName) room.displayName = displayName;
    SubscriptionManager.rooms.set(key, room);
    if (room.count > 1) return; // already joined
    SubscriptionManager.setupRejoin();
    await SubscriptionManager.postConnection(conversationId, churchId, room.personId, room.displayName);
  };

  // Debounce DELETE to avoid race where broadcast lands between DELETE and next POST (React StrictMode).
  private static pendingLeaves: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private static LEAVE_DEBOUNCE_MS = 300;

  static leaveRoom = async (conversationId: string, churchId: string) => {
    const key = SubscriptionManager.key(churchId, conversationId);
    const room = SubscriptionManager.rooms.get(key);
    if (!room || room.count <= 0) return;
    room.count--;
    if (room.count > 0) return;
    SubscriptionManager.rooms.delete(key);
    const existing = SubscriptionManager.pendingLeaves.get(key);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(async () => {
      SubscriptionManager.pendingLeaves.delete(key);
      if ((SubscriptionManager.rooms.get(key)?.count ?? 0) > 0) return;
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
    if (!SocketHelper.socketId || SocketHelper.socketId === SubscriptionManager.lastRejoinSocketId) return;
    SubscriptionManager.lastRejoinSocketId = SocketHelper.socketId;
    const entries = Array.from(SubscriptionManager.rooms.entries());
    await Promise.all(entries.map(([key, room]) => {
      const [churchId, conversationId] = key.split("|");
      return SubscriptionManager.postConnection(conversationId, churchId, room.personId, room.displayName);
    }));
  };

  static reset = () => {
    SubscriptionManager.rooms.clear();
    SubscriptionManager.pendingLeaves.forEach(timer => clearTimeout(timer));
    SubscriptionManager.pendingLeaves.clear();
    SubscriptionManager.lastRejoinSocketId = null;
  };

  static isJoined = (churchId: string, conversationId: string): boolean => {
    return (SubscriptionManager.rooms.get(SubscriptionManager.key(churchId, conversationId))?.count ?? 0) > 0;
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
