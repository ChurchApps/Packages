import { SocketHelper } from "./SocketHelper";
import { SubscriptionManager } from "./SubscriptionManager";
import { ConversationStore } from "./ConversationStore";
import { PresenceStore } from "./PresenceStore";
import { ApiHelper, UserContextInterface } from "@churchapps/helpers";

export interface NotificationCounts {
  notificationCount: number;
  pmCount: number;
}

export class NotificationService {
  private static instance: NotificationService;
  private counts: NotificationCounts = { notificationCount: 0, pmCount: 0 };
  private listeners: Array<(counts: NotificationCounts) => void> = [];
  private isInitialized: boolean = false;
  private currentPersonId: string | null = null;
  private loadTimeout: any | null = null;

  private constructor() {}

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  private initInFlight: Promise<void> | null = null;

  async initialize(context: UserContextInterface): Promise<void> {
    const targetPersonId = context?.person?.id || null;
    const targetChurchId = context?.userChurch?.church?.id || null;

    if (this.isInitialized) {
      if (targetPersonId === this.currentPersonId && targetChurchId === SocketHelper.getPersonChurch().churchId) {
        return;
      }
      SubscriptionManager.reset();
      ConversationStore.reset();
    }

    // Coalesce concurrent calls to avoid multiple WebSocket opens.
    if (this.initInFlight) return this.initInFlight;
    this.initInFlight = this.runInitialize(targetPersonId, targetChurchId, context);
    try {
      await this.initInFlight;
    } finally {
      this.initInFlight = null;
    }
  }

  private async runInitialize(targetPersonId: string | null, targetChurchId: string | null, context: UserContextInterface): Promise<void> {
    try {
      this.currentPersonId = targetPersonId;

      await SocketHelper.init();

      if (!this.changeUnsubscribe) {
        this.changeUnsubscribe = SocketHelper.onPersonChurchChange(() => {
          SubscriptionManager.reset();
          ConversationStore.reset();
        });
      }

      if (targetPersonId && targetChurchId) {
        SocketHelper.setPersonChurch({ personId: targetPersonId, churchId: targetChurchId });
      } else {
        console.warn("⚠️ NotificationService: Missing person/church IDs, cannot set socket context");
      }

      this.registerWebSocketHandlers();
      ConversationStore.ensureHandlers();
      PresenceStore.ensureHandlers();
      SubscriptionManager.setupRejoin();

      await this.loadNotificationCounts();

      this.isInitialized = true;
    } catch (error) {
      console.error("❌ Failed to initialize NotificationService:", error);
      throw error;
    }
  }

  private changeUnsubscribe: (() => void) | null = null;

  private registerWebSocketHandlers(): void {
    SocketHelper.addHandler("privateMessage", "NotificationService-PM", (data: any) => {
      try {
        if (!this.applyCountsFromPayload(data)) this.loadNotificationCounts();
      } catch (error) {
        console.error("❌ NotificationService: Error handling privateMessage socket event:", error);
      }
    });

    SocketHelper.addHandler("notification", "NotificationService-Notification", (data: any) => {
      try {
        if (!this.applyCountsFromPayload(data)) this.loadNotificationCounts();
      } catch (error) {
        console.error("❌ NotificationService: Error handling notification socket event:", error);
      }
    });

    SocketHelper.addHandler("message", "NotificationService-MessageUpdate", (data: any) => {
      if (data?.message?.personId === this.currentPersonId ||
          data?.notifyPersonId === this.currentPersonId) {
        try {
          this.debouncedLoadNotificationCounts();
        } catch (error) {
          console.error("❌ NotificationService: Error calling debouncedLoadNotificationCounts:", error);
        }
      }
    });

    SocketHelper.addHandler("reconnect", "NotificationService-Reconnect", (data: any) => {
      this.loadNotificationCounts();
    });
  }

  private applyCountsFromPayload(data: any): boolean {
    const counts = data?.counts;
    if (!counts || typeof counts !== "object") return false;
    const notificationCount = Number(counts.notificationCount);
    const pmCount = Number(counts.pmCount);
    if (!Number.isFinite(notificationCount) || !Number.isFinite(pmCount)) return false;
    this.updateCounts({ notificationCount, pmCount });
    return true;
  }

  private debouncedLoadNotificationCounts(): void {
    if (this.loadTimeout) {
      clearTimeout(this.loadTimeout);
    }

    this.loadTimeout = setTimeout(() => {
      this.loadNotificationCounts();
    }, 300); // 300ms debounce
  }

  async loadNotificationCounts(): Promise<void> {
    try {
      const counts = await ApiHelper.get("/notifications/unreadCount", "MessagingApi");

      const newCounts = {
        notificationCount: counts?.notificationCount || 0,
        pmCount: counts?.pmCount || 0
      };

      this.updateCounts(newCounts);

    } catch (error: any) {
      console.error("❌ Failed to load notification counts:", error);
      console.error("❌ Error details:", {
        message: error.message,
        status: error.status,
        response: error.response
      });
      // Don't throw - just log the error and keep existing counts
    }
  }

  private updateCounts(newCounts: NotificationCounts): void {
    const countsChanged =
      this.counts.notificationCount !== newCounts.notificationCount ||
      this.counts.pmCount !== newCounts.pmCount;

    if (countsChanged) {
      this.counts = { ...newCounts };
      this.listeners.forEach((listener, index) => {
        try {
          listener(this.counts);
        } catch (error) {
          console.error(`❌ Error in notification listener ${index}:`, error);
        }
      });
    }
  }

  subscribe(listener: (counts: NotificationCounts) => void): () => void {
    this.listeners.push(listener);
    listener(this.counts);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  getCounts(): NotificationCounts {
    return { ...this.counts };
  }

  async refresh(): Promise<void> {
    await this.loadNotificationCounts();
  }

  cleanup(): void {
    if (this.loadTimeout) {
      clearTimeout(this.loadTimeout);
      this.loadTimeout = null;
    }

    SocketHelper.removeHandler("NotificationService-PM");
    SocketHelper.removeHandler("NotificationService-Notification");
    SocketHelper.removeHandler("NotificationService-MessageUpdate");
    SocketHelper.removeHandler("NotificationService-Reconnect");

    this.listeners = [];

    if (this.changeUnsubscribe) {
      this.changeUnsubscribe();
      this.changeUnsubscribe = null;
    }
    SubscriptionManager.reset();
    ConversationStore.reset();

    this.counts = { notificationCount: 0, pmCount: 0 };
    this.currentPersonId = null;
    this.isInitialized = false;
  }

  isReady(): boolean {
    return this.isInitialized && SocketHelper.isConnected();
  }
}
