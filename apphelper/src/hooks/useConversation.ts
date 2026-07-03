"use client";
import { useCallback, useEffect, useState } from "react";
import { ApiHelper, ConversationInterface, MessageInterface, UserContextInterface } from "@churchapps/helpers";
import { ConversationStore } from "../helpers/ConversationStore";
import { SubscriptionManager } from "../helpers/SubscriptionManager";

export interface UseConversationOptions {
  /** content-keyed lookup (e.g. group, person, sermon, contentBlock). If contentId is empty, the hook is idle. */
  contentType?: string;
  contentId?: string;
  /** direct conversation id lookup (used by private messages where the conversation already exists). */
  conversationId?: string;
  /** required for join/leave room calls. */
  context?: UserContextInterface;
  /** if no conversation exists for this content yet, create one with this groupId/visibility on first post. */
  groupId?: string;
  visibility?: string;
  /** if true, the hook does not auto-join the realtime room. Used for transient previews. */
  skipSubscribe?: boolean;
}

export interface UseConversationResult {
  conversation: ConversationInterface | null;
  messages: MessageInterface[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  post: (content: string, messageType?: string) => Promise<MessageInterface | null>;
  edit: (messageId: string, content: string) => Promise<void>;
  remove: (messageId: string) => Promise<void>;
}

/** Subscribe to a conversation, get a live message list, and post/edit/delete. */
export function useConversation(opts: UseConversationOptions): UseConversationResult {
  const [conversation, setConversation] = useState<ConversationInterface | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const churchId = opts.context?.userChurch?.church?.id;
  const personId = opts.context?.person?.id;
  const displayName = opts.context?.person ? `${opts.context.person.name?.first ?? ""} ${opts.context.person.name?.last ?? ""}`.trim() : "";

  const hydrate = useCallback(async (): Promise<ConversationInterface | null> => {
    setError(null);
    try {
      if (opts.conversationId) {
        return await ConversationStore.loadByConversationId(opts.conversationId);
      }
      if (opts.contentType && opts.contentId) {
        return await ConversationStore.loadByContent(opts.contentType, opts.contentId);
      }
      return null;
    } catch (err: any) {
      setError(err?.message || "Failed to load conversation");
      return null;
    }
  }, [opts.contentType, opts.contentId, opts.conversationId]);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | null = null;
    let joinedConversationId: string | null = null;

    (async () => {
      setIsLoading(true);
      const conv = await hydrate();
      if (cancelled) return;
      if (conv?.id) {
        unsubscribe = ConversationStore.subscribe(conv.id, (updated) => {
          if (!cancelled) setConversation(updated);
        });
        if (!opts.skipSubscribe && churchId) {
          joinedConversationId = conv.id;
          await SubscriptionManager.joinRoom(conv.id, churchId, personId, displayName);
        }
      } else if (opts.conversationId) {
        unsubscribe = ConversationStore.subscribe(opts.conversationId, (updated) => {
          if (!cancelled) setConversation(updated);
        });
        if (!opts.skipSubscribe && churchId) {
          joinedConversationId = opts.conversationId;
          await SubscriptionManager.joinRoom(opts.conversationId, churchId, personId, displayName);
        }
      }
      if (!cancelled) setIsLoading(false);
    })();

    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
      if (joinedConversationId && churchId) {
        SubscriptionManager.leaveRoom(joinedConversationId, churchId).catch(() => { /* ignore */ });
      }
    };
  }, [hydrate, churchId, personId, displayName, opts.skipSubscribe, opts.conversationId]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    await hydrate();
    setIsLoading(false);
  }, [hydrate]);

  const ensureConversationId = useCallback(async (): Promise<string | null> => {
    if (conversation?.id) return conversation.id;
    if (opts.conversationId) return opts.conversationId;
    if (!opts.contentType || !opts.contentId) return null;
    const newConv: Partial<ConversationInterface> = {
      contentType: opts.contentType,
      contentId: opts.contentId,
      groupId: opts.groupId,
      visibility: opts.visibility ?? "public",
      title: `${opts.contentType}-${opts.contentId} Conversation`,
      allowAnonymousPosts: false
    };
    const result = await ApiHelper.post("/conversations", [newConv], "MessagingApi");
    const created = Array.isArray(result) ? result[0] : result;
    if (!created?.id) return null;
    ConversationStore.setConversation({ ...created, messages: [] });
    if (churchId) await SubscriptionManager.joinRoom(created.id, churchId, personId, displayName);
    return created.id;
  }, [
    conversation?.id, opts.conversationId, opts.contentType, opts.contentId, opts.groupId, opts.visibility, churchId, personId, displayName
  ]);

  const post = useCallback(async (content: string, messageType: string = "comment"): Promise<MessageInterface | null> => {
    const trimmed = content?.trim();
    if (!trimmed) return null;
    const targetConversationId = await ensureConversationId();
    if (!targetConversationId) {
      setError("Cannot post: missing conversation context");
      return null;
    }
    const message: MessageInterface = {
      conversationId: targetConversationId,
      messageType,
      content: trimmed,
      personId
    };
    const result = await ApiHelper.post("/messages", [message], "MessagingApi");
    return Array.isArray(result) ? result[0] : result;
  }, [ensureConversationId, personId]);

  const edit = useCallback(async (messageId: string, content: string): Promise<void> => {
    const trimmed = content?.trim();
    if (!trimmed) return;
    const targetConversationId = conversation?.id || opts.conversationId;
    if (!targetConversationId) return;
    const message: MessageInterface = { id: messageId, conversationId: targetConversationId, content: trimmed };
    await ApiHelper.post("/messages", [message], "MessagingApi");
  }, [conversation?.id, opts.conversationId]);

  const remove = useCallback(async (messageId: string): Promise<void> => {
    await ApiHelper.delete(`/messages/${messageId}`, "MessagingApi");
  }, []);

  return {
    conversation,
    messages: conversation?.messages ?? [],
    isLoading,
    error,
    refresh,
    post,
    edit,
    remove
  };
}
