/** Every webhook event B1 can emit. */
export type B1WebhookEventName =
  | "person.created" | "person.updated" | "person.destroyed"
  | "group.created" | "group.updated" | "group.destroyed"
  | "group.member.added" | "group.member.removed"
  | "household.created" | "household.updated" | "household.destroyed"
  | "donation.created" | "donation.updated"
  | "attendance.recorded"
  | "session.created"
  | "form.submission.created"
  | "event.created" | "event.updated" | "event.destroyed";

/** The HTTP headers B1 sends with every webhook delivery. */
export const WEBHOOK_HEADERS = {
  signature: "X-B1-Signature",
  event: "X-B1-Event",
  deliveryId: "X-B1-Delivery-Id",
  timestamp: "X-B1-Timestamp"
} as const;

/** The JSON body B1 POSTs to a subscriber URL. */
export interface B1WebhookEnvelope<T = unknown> {
  event: B1WebhookEventName;
  churchId: string;
  /** ISO 8601 timestamp. */
  occurredAt: string;
  data: T;
}

// `destroyed` events carry only { id, churchId }, so descriptive fields are optional.

export interface PersonWebhookData {
  id: string;
  churchId: string;
  name?: { display?: string; first?: string; last?: string };
  contactInfo?: { email?: string };
}

export interface GroupWebhookData {
  id: string;
  churchId: string;
  name?: string;
  categoryName?: string;
}

export interface GroupMemberWebhookData {
  id: string;
  churchId: string;
  groupId: string;
  personId: string;
}

export interface HouseholdWebhookData {
  id: string;
  churchId: string;
  name?: string;
}

export interface DonationWebhookData {
  id: string;
  churchId: string;
  personId?: string;
  batchId?: string;
  donationDate?: string;
  amount?: number;
  currency?: string;
  method?: string;
  status?: string;
}

export interface AttendanceWebhookData {
  id: string;
  churchId: string;
  personId?: string;
  visitDate?: string;
  checkinTime?: string;
}

export interface SessionWebhookData {
  id: string;
  churchId: string;
  groupId?: string;
  serviceTimeId?: string;
  sessionDate?: string;
}

export interface FormSubmissionWebhookData {
  id: string;
  churchId: string;
  formId?: string;
  contentType?: string;
  contentId?: string;
}

export interface EventWebhookData {
  id: string;
  churchId: string;
  groupId?: string;
  title?: string;
  start?: string;
  end?: string;
}

/**
 * Discriminated union of every webhook envelope — `switch (env.event)` narrows
 * `data` to the matching shape.
 */
export type B1Webhook =
  | B1WebhookEnvelope<PersonWebhookData> & { event: "person.created" | "person.updated" | "person.destroyed" }
  | B1WebhookEnvelope<GroupWebhookData> & { event: "group.created" | "group.updated" | "group.destroyed" }
  | B1WebhookEnvelope<GroupMemberWebhookData> & { event: "group.member.added" | "group.member.removed" }
  | B1WebhookEnvelope<HouseholdWebhookData> & { event: "household.created" | "household.updated" | "household.destroyed" }
  | B1WebhookEnvelope<DonationWebhookData> & { event: "donation.created" | "donation.updated" }
  | B1WebhookEnvelope<AttendanceWebhookData> & { event: "attendance.recorded" }
  | B1WebhookEnvelope<SessionWebhookData> & { event: "session.created" }
  | B1WebhookEnvelope<FormSubmissionWebhookData> & { event: "form.submission.created" }
  | B1WebhookEnvelope<EventWebhookData> & { event: "event.created" | "event.updated" | "event.destroyed" };
