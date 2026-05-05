import { ApiHelper, ArrayHelper, ConversationInterface, MessageInterface, PersonInterface } from "@churchapps/helpers";
import { SocketHelper } from "./SocketHelper";

type Listener = (conv: ConversationInterface) => void;

/**
 * In-memory cache of open conversations, keyed by conversationId.
 *
 * Components subscribe to a conversationId and receive a fresh snapshot every time
 * the underlying messages mutate (REST hydration, inbound socket message, edit, delete).
 * The store hooks SocketHelper's "message" / "deleteMessage" events once and applies them
 * to whichever conversations are currently open.
 */
export class ConversationStore {
  private static conversations: Map<string, ConversationInterface> = new Map();
  private static listeners: Map<string, Set<Listener>> = new Map();
  private static handlersRegistered = false;
  private static peopleCache: Map<string, PersonInterface> = new Map();

  static ensureHandlers = () => {
    if (ConversationStore.handlersRegistered) return;
    ConversationStore.handlersRegistered = true;

    SocketHelper.addHandler("message", "ConversationStore-Message", (data: any) => {
      const message: MessageInterface = data?.message || data;
      if (!message?.conversationId) return;
      ConversationStore.applyMessage(message);
    });

    SocketHelper.addHandler("deleteMessage", "ConversationStore-Delete", (data: any) => {
      const id = data?.id || data?.message?.id;
      const conversationId = data?.conversationId || data?.message?.conversationId;
      if (!id) return;
      ConversationStore.applyDelete(id, conversationId);
    });

    SocketHelper.addHandler("privateMessage", "ConversationStore-PM", (data: any) => {
      const message: MessageInterface = data?.message;
      if (message?.conversationId) ConversationStore.applyMessage(message);
    });
  };

  static reset = () => {
    ConversationStore.conversations.clear();
    ConversationStore.listeners.clear();
    ConversationStore.peopleCache.clear();
  };

  static forget = (conversationId: string): void => {
    ConversationStore.conversations.delete(conversationId);
    ConversationStore.listeners.delete(conversationId);
  };

  static getConversation = (conversationId: string): ConversationInterface | null => {
    return ConversationStore.conversations.get(conversationId) ?? null;
  };

  static setConversation = (conv: ConversationInterface) => {
    if (!conv?.id) return;
    ConversationStore.ensureHandlers();
    ConversationStore.conversations.set(conv.id, { ...conv, messages: [...(conv.messages ?? [])] });
    ConversationStore.notify(conv.id);
  };

  /**
   * Hydrate from REST. Loads /conversations/messages/{contentType}/{contentId} and any
   * unknown people. Returns the first conversation (matches existing UI which renders
   * a single thread per content item). Caches the result.
   */
  static loadByContent = async (contentType: string, contentId: string): Promise<ConversationInterface | null> => {
    if (!contentId) return null;
    ConversationStore.ensureHandlers();
    const conversations: ConversationInterface[] = await ApiHelper.get(`/conversations/messages/${contentType}/${contentId}`, "MessagingApi");
    if (!conversations || conversations.length === 0) return null;
    const conv = conversations[0];
    await ConversationStore.hydratePeople(conv);
    ConversationStore.conversations.set(conv.id, conv);
    ConversationStore.notify(conv.id);
    return conv;
  };

  static loadByConversationId = async (conversationId: string, churchId?: string): Promise<ConversationInterface | null> => {
    if (!conversationId) return null;
    ConversationStore.ensureHandlers();
    // Anonymous callers (no JWT) hit the unauthenticated /catchup route, which requires
    // a churchId. Authenticated callers use the JWT-protected /conversation/:id route.
    const messages: MessageInterface[] = ApiHelper.isAuthenticated
      ? await ApiHelper.get(`/messages/conversation/${conversationId}`, "MessagingApi")
      : (churchId ? await ApiHelper.getAnonymous(`/messages/catchup/${churchId}/${conversationId}`, "MessagingApi") : []);
    const existing = ConversationStore.conversations.get(conversationId) || { id: conversationId, messages: [] };
    const conv: ConversationInterface = { ...existing, id: conversationId, messages: messages || [] };
    await ConversationStore.hydratePeople(conv);
    ConversationStore.conversations.set(conversationId, conv);
    ConversationStore.notify(conversationId);
    return conv;
  };

  static applyMessage = (message: MessageInterface) => {
    if (!message?.conversationId) return;
    // Auto-vivify the conversation entry — covers the "first post creates the conversation"
    // case where the local tab never had a chance to call loadByConversationId before the
    // message arrived (either via socket broadcast or via direct apply from a POST response).
    let existing = ConversationStore.conversations.get(message.conversationId);
    if (!existing) {
      existing = { id: message.conversationId, messages: [] };
      ConversationStore.conversations.set(message.conversationId, existing);
    }
    const messages = existing.messages ? [...existing.messages] : [];
    const idx = messages.findIndex(m => m.id === message.id);
    const merged: MessageInterface = idx >= 0 ? { ...messages[idx], ...message } : { ...message };
    if (!merged.person && merged.personId) {
      const cached = ConversationStore.peopleCache.get(merged.personId);
      if (cached) merged.person = cached;
    }
    if (idx >= 0) messages[idx] = merged;
    else messages.push(merged);
    ConversationStore.conversations.set(message.conversationId, { ...existing, messages });
    ConversationStore.notify(message.conversationId);
    if (!merged.person && merged.personId) ConversationStore.fetchPerson(merged.personId, message.conversationId).catch(() => { /* ignore */ });
  };

  static applyDelete = (messageId: string, conversationId?: string) => {
    if (conversationId) {
      const existing = ConversationStore.conversations.get(conversationId);
      if (!existing?.messages) return;
      const next = { ...existing, messages: existing.messages.filter(m => m.id !== messageId) };
      ConversationStore.conversations.set(conversationId, next);
      ConversationStore.notify(conversationId);
      return;
    }
    // No conversationId on the payload — scan
    ConversationStore.conversations.forEach((conv, id) => {
      if (!conv.messages?.some(m => m.id === messageId)) return;
      const next = { ...conv, messages: conv.messages.filter(m => m.id !== messageId) };
      ConversationStore.conversations.set(id, next);
      ConversationStore.notify(id);
    });
  };

  static subscribe = (conversationId: string, listener: Listener): (() => void) => {
    ConversationStore.ensureHandlers();
    let set = ConversationStore.listeners.get(conversationId);
    if (!set) {
      set = new Set();
      ConversationStore.listeners.set(conversationId, set);
    }
    set.add(listener);
    const cached = ConversationStore.conversations.get(conversationId);
    if (cached) listener(cached);
    return () => {
      const s = ConversationStore.listeners.get(conversationId);
      if (!s) return;
      s.delete(listener);
      if (s.size === 0) ConversationStore.listeners.delete(conversationId);
    };
  };

  private static notify = (conversationId: string) => {
    const conv = ConversationStore.conversations.get(conversationId);
    if (!conv) return;
    const set = ConversationStore.listeners.get(conversationId);
    set?.forEach(listener => {
      try { listener(conv); } catch (err) { console.error("ConversationStore listener error:", err); }
    });
  };

  private static hydratePeople = async (conv: ConversationInterface) => {
    const messages = conv.messages || [];
    const missing: string[] = [];
    messages.forEach(m => {
      if (!m.personId) return;
      const cached = ConversationStore.peopleCache.get(m.personId);
      if (cached) { m.person = cached; return; }
      if (!missing.includes(m.personId)) missing.push(m.personId);
    });
    if (missing.length === 0) return;
    // /people/ids requires auth; anonymous live-stream viewers rely on the displayName
    // already on each message and skip person hydration.
    if (!ApiHelper.isAuthenticated) return;
    try {
      const people: PersonInterface[] = await ApiHelper.get(`/people/ids?ids=${missing.join(",")}`, "MembershipApi");
      people?.forEach(p => { if (p?.id) ConversationStore.peopleCache.set(p.id, p); });
      messages.forEach(m => {
        if (!m.person && m.personId) m.person = ArrayHelper.getOne(people, "id", m.personId) as PersonInterface;
      });
    } catch (err) {
      console.warn("ConversationStore.hydratePeople failed:", err);
    }
  };

  private static fetchPerson = async (personId: string, conversationId: string) => {
    if (ConversationStore.peopleCache.has(personId)) return;
    if (!ApiHelper.isAuthenticated) return;
    try {
      const people: PersonInterface[] = await ApiHelper.get(`/people/ids?ids=${personId}`, "MembershipApi");
      const person = people?.[0];
      if (!person) return;
      ConversationStore.peopleCache.set(personId, person);
      const conv = ConversationStore.conversations.get(conversationId);
      if (!conv?.messages) return;
      let changed = false;
      const messages = conv.messages.map(m => {
        if (m.personId === personId && !m.person) { changed = true; return { ...m, person }; }
        return m;
      });
      if (changed) {
        ConversationStore.conversations.set(conversationId, { ...conv, messages });
        ConversationStore.notify(conversationId);
      }
    } catch { /* ignore */ }
  };
}
