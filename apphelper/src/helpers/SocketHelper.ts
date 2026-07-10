import { ConnectionInterface, SocketActionHandlerInterface, SocketPayloadInterface, ApiHelper, ArrayHelper, CommonEnvironmentHelper } from "@churchapps/helpers";

const HANDSHAKE_TIMEOUT_MS = 5000;
const PROBE_TIMEOUT_MS = 3000;
const MAX_BACKOFF_MS = 30000;

export class SocketHelper {
  static socket: WebSocket | null;
  static socketId: string | null;
  static actionHandlers: SocketActionHandlerInterface[] = [];
  private static personIdChurchId: { personId: string, churchId: string } = { personId: "", churchId: "" };
  private static deliberateClose = false;
  private static hadConnection = false;
  private static reconnectAttempts = 0;
  private static reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private static connectInFlight: Promise<void> | null = null;
  private static resumeListenersRegistered = false;
  private static socketIdWaiters: Array<() => void> = [];
  private static lastFrameAt = 0;
  private static probeInFlight = false;

  static setPersonChurch = (pc: { personId: string, churchId: string }) => {
    if (!pc?.personId || !pc?.churchId) return;
    const churchChanged = pc.churchId !== this.personIdChurchId.churchId;
    const personChanged = pc.personId !== this.personIdChurchId.personId;
    if (!churchChanged && !personChanged) return;

    if (this.personIdChurchId.churchId || this.personIdChurchId.personId) {
      this.changeListeners.forEach((cb) => {
        try { cb({ previous: this.personIdChurchId, next: pc }); } catch (err) { console.error("SocketHelper change listener error:", err); }
      });
    }

    this.personIdChurchId = pc;
    this.createAlertConnection();
  };

  static getPersonChurch = (): { personId: string, churchId: string } => {
    return { ...this.personIdChurchId };
  };

  static onPersonChurchChange = (listener: (info: { previous: { personId: string, churchId: string }, next: { personId: string, churchId: string } }) => void) => {
    this.changeListeners.push(listener);
    return () => {
      this.changeListeners = this.changeListeners.filter(l => l !== listener);
    };
  };

  private static changeListeners: Array<(info: { previous: { personId: string, churchId: string }, next: { personId: string, churchId: string } }) => void> = [];

  private static socketIdListeners: Array<(socketId: string) => void> = [];

  static onSocketIdReady = (listener: (socketId: string) => void) => {
    SocketHelper.socketIdListeners.push(listener);
    return () => {
      SocketHelper.socketIdListeners = SocketHelper.socketIdListeners.filter(l => l !== listener);
    };
  };

  static createAlertConnection = () => {
    if (SocketHelper.personIdChurchId.personId && SocketHelper.socketId) {
      const connection: ConnectionInterface = {
        conversationId: "alerts",
        churchId: SocketHelper.personIdChurchId.churchId,
        displayName: "",
        socketId: SocketHelper.socketId,
        personId: SocketHelper.personIdChurchId.personId
      };

      ApiHelper.postAnonymous("/connections", [connection], "MessagingApi")
        .catch((err: unknown) => console.warn("SocketHelper.createAlertConnection failed:", err));
    }
  };

  static init = async () => {
    SocketHelper.deliberateClose = false;
    SocketHelper.registerResumeListeners();
    if (SocketHelper.isConnected() && SocketHelper.socketId) return;
    if (SocketHelper.connectInFlight) return SocketHelper.connectInFlight;
    if (SocketHelper.socket && SocketHelper.socket.readyState === SocketHelper.socket.CONNECTING) {
      await SocketHelper.waitForSocketId(HANDSHAKE_TIMEOUT_MS);
      if (SocketHelper.socketId) return;
    }
    await SocketHelper.connect();
  };

  // Resolves once the handshake completes (or the retry loop has taken over); never rejects.
  private static connect = (): Promise<void> => {
    if (SocketHelper.connectInFlight) return SocketHelper.connectInFlight;
    const promise = new Promise<void>((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        resolve();
      };
      try {
        SocketHelper.closeSocket();
        const ws = new WebSocket(CommonEnvironmentHelper.MessagingApiSocket);
        SocketHelper.socket = ws;
        SocketHelper.socketId = null;

        ws.onmessage = (event) => {
          if (ws !== SocketHelper.socket) return;
          SocketHelper.lastFrameAt = Date.now();
          try {
            SocketHelper.handleMessage(JSON.parse(event.data));
          } catch { /* ignore parse errors */ }
        };

        ws.onopen = () => {
          ws.send("getId");
          SocketHelper.waitForSocketId(HANDSHAKE_TIMEOUT_MS).then(() => {
            if (!SocketHelper.socketId) SocketHelper.scheduleReconnect();
            finish();
          });
        };

        ws.onclose = () => {
          if (ws !== SocketHelper.socket) return;
          SocketHelper.socketId = null;
          if (!SocketHelper.deliberateClose) SocketHelper.scheduleReconnect();
          finish();
        };

        ws.onerror = () => { /* onclose follows and owns the retry */ };
      } catch (error) {
        console.error("SocketHelper.connect failed:", error);
        SocketHelper.scheduleReconnect();
        finish();
      }
    });
    SocketHelper.connectInFlight = promise.finally(() => { SocketHelper.connectInFlight = null; });
    return SocketHelper.connectInFlight;
  };

  private static waitForSocketId = (timeoutMs: number): Promise<void> => new Promise((resolve) => {
    if (SocketHelper.socketId) return resolve();
    let done = false;
    const waiter = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      SocketHelper.socketIdWaiters = SocketHelper.socketIdWaiters.filter(w => w !== waiter);
      resolve();
    }, timeoutMs);
    SocketHelper.socketIdWaiters.push(waiter);
  });

  private static scheduleReconnect = () => {
    if (SocketHelper.deliberateClose || SocketHelper.reconnectTimer) return;
    const delay = Math.min(MAX_BACKOFF_MS, 1000 * Math.pow(2, SocketHelper.reconnectAttempts));
    SocketHelper.reconnectAttempts++;
    SocketHelper.reconnectTimer = setTimeout(() => {
      SocketHelper.reconnectTimer = null;
      if (SocketHelper.deliberateClose || SocketHelper.isConnected()) return;
      SocketHelper.connect();
    }, delay);
  };

  private static registerResumeListeners = () => {
    if (SocketHelper.resumeListenersRegistered || typeof window === "undefined") return;
    SocketHelper.resumeListenersRegistered = true;
    const onResume = () => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      SocketHelper.checkConnection();
    };
    window.addEventListener("online", onResume);
    window.addEventListener("focus", onResume);
    window.addEventListener("pageshow", onResume);
    if (typeof document !== "undefined") document.addEventListener("visibilitychange", onResume);
  };

  static checkConnection = () => {
    if (SocketHelper.deliberateClose) return;
    if (!SocketHelper.isConnected()) {
      if (SocketHelper.reconnectTimer) {
        clearTimeout(SocketHelper.reconnectTimer);
        SocketHelper.reconnectTimer = null;
      }
      SocketHelper.reconnectAttempts = 0;
      SocketHelper.connect();
      return;
    }
    SocketHelper.probeConnection();
  };

  // OS suspend can leave readyState OPEN on a dead TCP link; verify with a getId echo.
  private static probeConnection = () => {
    if (SocketHelper.probeInFlight) return;
    SocketHelper.probeInFlight = true;
    const before = SocketHelper.lastFrameAt;
    try {
      SocketHelper.socket!.send("getId");
    } catch {
      SocketHelper.probeInFlight = false;
      SocketHelper.connect();
      return;
    }
    setTimeout(() => {
      SocketHelper.probeInFlight = false;
      if (SocketHelper.deliberateClose) return;
      if (SocketHelper.lastFrameAt === before) SocketHelper.connect();
    }, PROBE_TIMEOUT_MS);
  };

  static addHandler = (action: string, id: string, handleMessage: (data: any) => void) => {
    const existing = ArrayHelper.getOne(SocketHelper.actionHandlers, "id", id);
    if (existing !== null) {
      existing.handleMessage = handleMessage;
    } else {
      SocketHelper.actionHandlers.push({ action, id, handleMessage });
    }
  };

  static removeHandler = (id: string) => {
    SocketHelper.actionHandlers = SocketHelper.actionHandlers.filter(handler => handler.id !== id);
  };

  static removeHandlersByAction = (action: string) => {
    SocketHelper.actionHandlers = SocketHelper.actionHandlers.filter(handler => handler.action !== action);
  };

  static clearAllHandlers = () => {
    SocketHelper.actionHandlers = [];
  };

  static handleMessage = (payload: SocketPayloadInterface) => {
    try {
      if (payload.action === "socketId") {
        const previousId = SocketHelper.socketId;
        SocketHelper.socketId = payload.data;
        const waiters = SocketHelper.socketIdWaiters;
        SocketHelper.socketIdWaiters = [];
        waiters.forEach(w => w());
        if (payload.data === previousId) return; // liveness probe echo
        SocketHelper.reconnectAttempts = 0;
        SocketHelper.createAlertConnection();
        SocketHelper.socketIdListeners.forEach((cb) => {
          try { cb(payload.data); } catch (err) { console.error("SocketHelper socketId listener error:", err); }
        });
        if (SocketHelper.hadConnection) SocketHelper.dispatchLocal("reconnect");
        SocketHelper.hadConnection = true;
      } else {
        const matchingHandlers = ArrayHelper.getAll(SocketHelper.actionHandlers, "action", payload.action);
        matchingHandlers.forEach((handler) => {
          try {
            handler.handleMessage(payload.data);
          } catch (error) {
            console.error(`Error in handler ${handler.id}:`, error);
          }
        });
      }
    } catch (error) {
      console.error("Error handling socket message:", error);
    }
  };

  private static dispatchLocal = (action: string) => {
    const handlers = ArrayHelper.getAll(SocketHelper.actionHandlers, "action", action);
    handlers.forEach((handler) => {
      try {
        handler.handleMessage(null);
      } catch (error) {
        console.error(`Error in handler ${handler.id}:`, error);
      }
    });
  };

  private static closeSocket = () => {
    const ws = SocketHelper.socket;
    if (ws && ws.readyState !== ws.CLOSED) {
      try {
        ws.onclose = null;
        ws.close();
      } catch { /* ignore */ }
    }
  };

  static cleanup = () => {
    SocketHelper.deliberateClose = true;
    if (SocketHelper.reconnectTimer) {
      clearTimeout(SocketHelper.reconnectTimer);
      SocketHelper.reconnectTimer = null;
    }
    SocketHelper.reconnectAttempts = 0;
    SocketHelper.hadConnection = false;
    SocketHelper.closeSocket();

    // Preserve handlers across reconnects.
    SocketHelper.socket = null;
    SocketHelper.socketId = null;
    SocketHelper.personIdChurchId = { personId: "", churchId: "" };
  };

  static disconnect = () => {
    SocketHelper.cleanup();
  };

  static isConnected = (): boolean => {
    return !!SocketHelper.socket && SocketHelper.socket.readyState === SocketHelper.socket.OPEN;
  };

  static getConnectionState = (): string => {
    if (!SocketHelper.socket) return "UNINITIALIZED";

    switch (SocketHelper.socket.readyState) {
      case SocketHelper.socket.CONNECTING: return "CONNECTING";
      case SocketHelper.socket.OPEN: return "OPEN";
      case SocketHelper.socket.CLOSING: return "CLOSING";
      case SocketHelper.socket.CLOSED: return "CLOSED";
      default: return "UNKNOWN";
    }
  };

  static setupGlobalCleanup = () => {
    if (typeof window !== "undefined") {
      const cleanup = () => {
        SocketHelper.cleanup();
      };

      window.addEventListener("beforeunload", cleanup);
      window.addEventListener("unload", cleanup);

      return cleanup;
    }
  };

}
