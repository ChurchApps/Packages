import { describe, it, expect } from "vitest";
import { ConversationStore } from "../ConversationStore";

describe("ConversationStore.applyMessage", () => {
  it("stamps a new message that arrives without timeSent so it sorts after older notes", () => {
    const before = Date.now();
    ConversationStore.applyMessage({ id: "m-new", conversationId: "c-timesent", content: "hi" } as any);
    const conv = ConversationStore.getConversation("c-timesent");
    const sent = new Date(conv!.messages![0].timeSent as any).getTime();
    expect(sent).toBeGreaterThanOrEqual(before);
  });

  it("keeps the server timeSent when present", () => {
    ConversationStore.applyMessage({ id: "m-old", conversationId: "c-keep", timeSent: "2024-01-02T03:04:05.000Z" } as any);
    const conv = ConversationStore.getConversation("c-keep");
    expect(new Date(conv!.messages![0].timeSent as any).toISOString()).toBe("2024-01-02T03:04:05.000Z");
  });
});
