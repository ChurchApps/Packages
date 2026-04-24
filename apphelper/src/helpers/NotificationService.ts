import { SocketHelper } from "./SocketHelper";
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

  /**
   * Initialize the notification service with user context
   */
  async initialize(context: UserContextInterface): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Store current person ID for conversation counting
      this.currentPersonId = context?.person?.id || null;

      // Initialize WebSocket connection
      await SocketHelper.init();

      // Set person/church context for websocket
      if (context?.person?.id && context?.userChurch?.church?.id) {
        SocketHelper.setPersonChurch({
          personId: context.person.id,
          churchId: context.userChurch.church.id
        });
      } else {
        console.warn("⚠️ NotificationService: Missing person/church IDs, cannot set socket context");
      }

      // Register handlers for notification updates
      this.registerWebSocketHandlers();

      // Load initial notification counts
      await this.loadNotificationCounts();

      this.isInitialized = true;

    } catch (error) {
      console.error("❌ Failed to initialize NotificationService:", error);
      throw error;
    }
  }

  /**
   * Register websocket handlers for real-time notification updates
   */
  private registerWebSocketHandlers(): void {
    // Handler for new private messages
    SocketHelper.addHandler("privateMessage", "NotificationService-PM", (data: any) => {
      try {
        if (!this.applyCountsFromPayload(data)) this.loadNotificationCounts();
      } catch (error) {
        console.error("❌ NotificationService: Error handling privateMessage socket event:", error);
      }
    });

    // Handler for general notifications
    SocketHelper.addHandler("notification", "NotificationService-Notification", (data: any) => {
      try {
        if (!this.applyCountsFromPayload(data)) this.loadNotificationCounts();
      } catch (error) {
        console.error("❌ NotificationService: Error handling notification socket event:", error);
      }
    });

    // Handler for message updates that could affect notification counts
    SocketHelper.addHandler("message", "NotificationService-MessageUpdate", (data: any) => {
      // Only update counts if the message update involves the current person
      if (data?.message?.personId === this.currentPersonId ||
          data?.notifyPersonId === this.currentPersonId) {
        try {
          this.debouncedLoadNotificationCounts();
        } catch (error) {
          console.error("❌ NotificationService: Error calling debouncedLoadNotificationCounts:", error);
        }
      }
    });

    // Handler for reconnect events
    SocketHelper.addHandler("reconnect", "NotificationService-Reconnect", (data: any) => {
      this.loadNotificationCounts(); // Don't debounce reconnect - need immediate update
    });
  }

  /**
   * If the socket payload carries fresh counts, apply them directly and skip the
   * extra API round-trip. Returns true when counts were applied.
   */
  private applyCountsFromPayload(data: any): boolean {
    const counts = data?.counts;
    if (!counts || typeof counts !== "object") return false;
    const notificationCount = Number(counts.notificationCount);
    const pmCount = Number(counts.pmCount);
    if (!Number.isFinite(notificationCount) || !Number.isFinite(pmCount)) return false;
    this.updateCounts({ notificationCount, pmCount });
    return true;
  }

  /**
   * Load notification counts from the API with debouncing
   */
  private debouncedLoadNotificationCounts(): void {

    if (this.loadTimeout) {
      clearTimeout(this.loadTimeout);
    }

    this.loadTimeout = setTimeout(() => {
      this.loadNotificationCounts();
    }, 300); // 300ms debounce
  }

  /**
   * Load notification counts from the API
   */
  async loadNotificationCounts(): Promise<void> {

    try {
      // Use the unreadCount endpoint which returns both notification and PM counts
      const counts = await ApiHelper.get("/notifications/unreadCount", "MessagingApi");

      const newCounts = {
        notificationCount: counts?.notificationCount || 0,
        pmCount: counts?.pmCount || 0
      };


      // Update counts and notify listeners
      this.updateCounts(newCounts);

    } catch (error) {
      console.error("❌ Failed to load notification counts:", error);
      console.error("❌ Error details:", {
        message: error.message,
        status: error.status,
        response: error.response
      });
      // Don't throw - just log the error and keep existing counts
    }
  }

  /**
   * Update counts and notify all listeners
   */
  private updateCounts(newCounts: NotificationCounts): void {

    const countsChanged =
      this.counts.notificationCount !== newCounts.notificationCount ||
      this.counts.pmCount !== newCounts.pmCount;


    if (countsChanged) {
      this.counts = { ...newCounts };

      // Notify all listeners
      this.listeners.forEach((listener, index) => {
        try {
          listener(this.counts);
        } catch (error) {
          console.error(`❌ Error in notification listener ${index}:`, error);
        }
      });
    }
  }

  /**
   * Subscribe to notification count changes
   */
  subscribe(listener: (counts: NotificationCounts) => void): () => void {
    this.listeners.push(listener);

    // Immediately call with current counts
    listener(this.counts);

    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Get current notification counts
   */
  getCounts(): NotificationCounts {
    return { ...this.counts };
  }

  /**
   * Manually refresh notification counts
   */
  async refresh(): Promise<void> {
    await this.loadNotificationCounts();
  }

  /**
   * Cleanup the service
   */
  cleanup(): void {
    // Clear any pending timeout
    if (this.loadTimeout) {
      clearTimeout(this.loadTimeout);
      this.loadTimeout = null;
    }

    // Remove websocket handlers
    SocketHelper.removeHandler("NotificationService-PM");
    SocketHelper.removeHandler("NotificationService-Notification");
    SocketHelper.removeHandler("NotificationService-MessageUpdate");
    SocketHelper.removeHandler("NotificationService-Reconnect");

    // Clear listeners
    this.listeners = [];

    // Reset state
    this.counts = { notificationCount: 0, pmCount: 0 };
    this.currentPersonId = null;
    this.isInitialized = false;
  }

  /**
   * Check if service is initialized
   */
  isReady(): boolean {
    return this.isInitialized && SocketHelper.isConnected();
  }
}
