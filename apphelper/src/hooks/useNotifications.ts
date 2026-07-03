"use client";
import React, { useState, useEffect, useCallback } from "react";
import { NotificationService, NotificationCounts } from "../helpers/NotificationService";
import { UserContextInterface } from "@churchapps/helpers";

export interface UseNotificationsResult {
  counts: NotificationCounts;
  isLoading: boolean;
  isReady: boolean;
  refresh: () => Promise<void>;
  error: string | null;
}

/** Custom hook for managing real-time notifications */
export function useNotifications(context: UserContextInterface | null): UseNotificationsResult {
  const [counts, setCounts] = useState<NotificationCounts>({ notificationCount: 0, pmCount: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const notificationService = React.useMemo(() => NotificationService.getInstance(), []);

  useEffect(() => {
    if (!context?.person?.id || !context?.userChurch?.church?.id) {
      setIsLoading(false);
      return;
    }

    const initializeService = async () => {
      try {
        setIsLoading(true);
        setError(null);

        await notificationService.initialize(context);
      } catch (err) {
        console.error("❌ useNotifications: Failed to initialize:", err);
        setError(err instanceof Error ? err.message : "Failed to initialize notifications");
      } finally {
        setIsLoading(false);
      }
    };

    initializeService();
  }, [context?.person?.id, context?.userChurch?.church?.id]);

  useEffect(() => {
    const unsubscribe = notificationService.subscribe((newCounts) => {
      setCounts(newCounts);
    });

    return () => {
      unsubscribe();
    };
  }, [notificationService]);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      await NotificationService.getInstance().refresh();
    } catch (err) {
      console.error("❌ useNotifications: Refresh failed:", err);
      setError(err instanceof Error ? err.message : "Failed to refresh notifications");
    }
  }, []);

  return {
    counts,
    isLoading,
    isReady: notificationService.isReady(),
    refresh,
    error
  };
}
