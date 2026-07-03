import { ConnectionInterface, SocketActionHandlerInterface, SocketPayloadInterface, ApiHelper, ArrayHelper, CommonEnvironmentHelper } from "@churchapps/helpers";

export class SocketHelper {
  static socket: WebSocket;
  static socketId: string;
  static actionHandlers: SocketActionHandlerInterface[] = [];
  private static personIdChurchId: { personId: string, churchId: string } = { personId: "", churchId: "" };
  private static isCleanedUp: boolean = false;

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
        displayName: "Test",
        socketId: SocketHelper.socketId,
        personId: SocketHelper.personIdChurchId.personId
      };

      ApiHelper.postAnonymous("/connections", [connection], "MessagingApi");
    }
  };

  static init = async () => {
    // Idempotent: don't tear down an open or connecting socket; wait for socketId instead.
    if (SocketHelper.socket && (SocketHelper.socket.readyState === SocketHelper.socket.OPEN || SocketHelper.socket.readyState === SocketHelper.socket.CONNECTING)) {
      if (SocketHelper.socketId) return;
      await new Promise<void>((resolve) => {
        const start = Date.now();
        const tick = () => {
          if (SocketHelper.socketId) return resolve();
          if (Date.now() - start > 3000) return resolve();
          setTimeout(tick, 50);
        };
        tick();
      });
      if (SocketHelper.socketId) return;
    }

    SocketHelper.cleanup();
    SocketHelper.isCleanedUp = false;

    if (SocketHelper.socket && SocketHelper.socket.readyState !== SocketHelper.socket.CLOSED) {
      try { SocketHelper.socket.close(); } catch { /* ignore */ }
    }

    await new Promise((resolve, reject) => {
      try {
        SocketHelper.socket = new WebSocket(CommonEnvironmentHelper.MessagingApiSocket);

        SocketHelper.socket.onmessage = (event) => {
          if (SocketHelper.isCleanedUp) return;
          try {
            const payload = JSON.parse(event.data);
            SocketHelper.handleMessage(payload);
          } catch { /* ignore parse errors */ }
        };

        SocketHelper.socket.onopen = async () => {
          SocketHelper.socket.send("getId");

          setTimeout(() => {
            resolve(null);
          }, 3000);
        };

        SocketHelper.socket.onclose = async () => { };

        SocketHelper.socket.onerror = (error) => {
          reject(error);
        };

      } catch (error) {
        reject(error);
      }
    });
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
    if (SocketHelper.isCleanedUp) return;

    try {
      if (payload.action === "socketId") {
        const previousId = SocketHelper.socketId;
        SocketHelper.socketId = payload.data;
        SocketHelper.createAlertConnection();
        // Notify SubscriptionManager to flush pending joinRoom calls.
        if (!previousId) {
          SocketHelper.socketIdListeners.forEach((cb) => {
            try { cb(payload.data); } catch (err) { console.error("SocketHelper socketId listener error:", err); }
          });
        }
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

  static cleanup = () => {
    SocketHelper.isCleanedUp = true;

    if (SocketHelper.socket && SocketHelper.socket.readyState !== SocketHelper.socket.CLOSED) {
      try {
        SocketHelper.socket.close();
      } catch { /* ignore */ }
    }

    // Preserve handlers across reconnects.
    SocketHelper.socket = null;
    SocketHelper.socketId = null;
    SocketHelper.personIdChurchId = { personId: "", churchId: "" };
  };

  static disconnect = () => {
    SocketHelper.cleanup();
  };

  static isConnected = (): boolean => {
    return SocketHelper.socket && SocketHelper.socket.readyState === SocketHelper.socket.OPEN;
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
