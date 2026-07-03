"use client";

import React from "react";
import { IconButton, Tooltip, Icon } from "@mui/material";
import { ApiHelper, Locale } from "../../helpers";
import type { MessageInterface } from "@churchapps/helpers";

/** Subscription markers toggle notifications per person; never render in visible thread */
export const SUBSCRIPTION_MESSAGE_TYPE = "subscription";

/** Strip subscription markers from a message list before display. */
export function filterVisibleMessages(messages: MessageInterface[] | null | undefined): MessageInterface[] {
  if (!messages) return [];
  return messages.filter((m) => m.messageType !== SUBSCRIPTION_MESSAGE_TYPE);
}

/** Compute subscription state: latest action by personId wins (real comment=subscribed, "subscription"/"off"=muted, else=subscribed) */
export function computeSubscriptionState(messages: MessageInterface[] | null | undefined, personId: string | undefined): boolean {
  if (!messages || !personId) return false;
  let subscribed = false;
  const sorted = [...messages].sort((a, b) => {
    const ta = a.timeSent ? new Date(a.timeSent).getTime() : 0;
    const tb = b.timeSent ? new Date(b.timeSent).getTime() : 0;
    return ta - tb;
  });
  for (const m of sorted) {
    if (m.personId !== personId) continue;
    if (m.messageType === SUBSCRIPTION_MESSAGE_TYPE) subscribed = m.content !== "off";
    else subscribed = true;
  }
  return subscribed;
}

interface Props {
  conversationId: string | undefined;
  messages: MessageInterface[] | null | undefined;
  personId: string | undefined;
  size?: "small" | "medium";
  /** Override the default color (e.g. for a dark dialog header). */
  color?: string;
  /** Override the muted color. */
  mutedColor?: string;
}

/** Bell icon toggling notification subscription for this conversation; renders nothing if conversationId or personId missing */
export const SubscriptionToggle: React.FC<Props> = ({ conversationId, messages, personId, size = "small", color, mutedColor }) => {
  const subscribed = React.useMemo(() => computeSubscriptionState(messages, personId), [messages, personId]);
  const [busy, setBusy] = React.useState(false);

  const onToggle = async () => {
    if (!conversationId || !personId || busy) return;
    setBusy(true);
    const next = subscribed ? "off" : "on";
    try {
      await ApiHelper.post(
        "/messages",
        [{ conversationId, messageType: SUBSCRIPTION_MESSAGE_TYPE, content: next }],
        "MessagingApi"
      );
    } catch (err) {
      console.warn("SubscriptionToggle.toggle failed:", err);
    } finally {
      setBusy(false);
    }
  };

  if (!conversationId || !personId) return null;

  const tooltip = subscribed
    ? Locale.label("notes.notifyOn", "Notifications on — click to mute")
    : Locale.label("notes.notifyOff", "Notifications muted — click to enable");

  return (
    <Tooltip title={tooltip} arrow>
      <span>
        <IconButton
          size={size}
          onClick={onToggle}
          disabled={busy}
          aria-label={subscribed ? "Mute notifications" : "Enable notifications"}
          data-testid="subscription-toggle"
          sx={{ color: subscribed ? (color ?? "primary.main") : (mutedColor ?? "text.disabled") }}
        >
          <Icon fontSize={size === "medium" ? "medium" : "small"}>
            {subscribed ? "notifications_active" : "notifications_off"}
          </Icon>
        </IconButton>
      </span>
    </Tooltip>
  );
};
