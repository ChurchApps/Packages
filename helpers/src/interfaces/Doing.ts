export interface ActionInterface {
  id?: string;
  automationId?: string;
  actionType?: string;
  actionData?: string;
}
export interface AutomationInterface {
  id?: string;
  title: string;
  recurs: string;
  active: boolean;
}
export interface ConditionInterface {
  id?: string;
  conjunctionId?: string;
  field?: string;
  fieldData?: string;
  operator?: string;
  value?: string;
  label?: string;
}
export interface ConjunctionInterface {
  id?: string;
  automationId?: string;
  parentId?: string;
  groupType?: string;
  conjunctions?: ConjunctionInterface[];
  conditions?: ConditionInterface[];
}
export interface TaskInterface {
  id?: string;
  taskNumber?: number;
  taskType?: string;
  dateCreated?: Date;
  dateClosed?: Date;
  associatedWithType?: string;
  associatedWithId?: string;
  associatedWithLabel?: string;
  createdByType?: string;
  createdById?: string;
  createdByLabel?: string;
  assignedToType?: string;
  assignedToId?: string;
  assignedToLabel?: string;
  title?: string;
  status?: string;
  automationId?: string;
  conversationId?: string;
  data?: string;
}

export interface PlanInterface {
  id?: string;
  churchId?: string;
  name?: string;
  ministryId?: string;
  serviceDate?: Date;
  notes?: string;
  contentType?: string;
  contentId?: string;
  // Content provider fields
  providerId?: string;
  providerPlanId?: string;  // Path to the content in the provider
  providerPlanName?: string;
}
export interface PositionInterface {
  id?: string;
  churchId?: string;
  planId?: string;
  categoryName?: string;
  name?: string;
  count?: number;
  groupId?: string;
}
export interface AssignmentInterface {
  id?: string;
  churchId?: string;
  positionId?: string;
  personId?: string;
  status?: string;
  notified?: Date;
}
export interface TimeInterface {
  id?: string;
  churchId?: string;
  planId?: string;
  displayName?: string;
  startTime?: Date;
  endTime?: Date;
  teams?: string;
  teamList?: string[];
}
export interface BlockoutDateInterface {
  id?: string;
  churchId?: string;
  personId?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface ExternalVenueRefInterface {
  externalProviderId: string;
  programId: string;
  studyId: string;
  lessonId: string;
  venueId: string;
}

export interface ContentFileInterface {
  id?: string;
  name?: string;
  url?: string;
  fileType?: string;  // "image", "video", "audio", "document"
  seconds?: number;
}

export interface PlanItemContentInterface {
  provider: string;           // "lessons", "songs", "media", "church"
  embedUrl?: string;          // URL for iframe embed
  html?: string;              // Raw HTML content
  files?: ContentFileInterface[];
  metadata?: Record<string, any>;  // Provider-specific data
}

export interface PlanItemInterface {
  id?: string;
  planId?: string;
  parentId?: string;
  sort?: number;
  itemType?: string;  // "header", "song", "lessonAction", "lessonAddOn", "lessonSection", "item"
  relatedId?: string;
  label?: string;
  description?: string;
  seconds?: number;
  link?: string;
  children?: PlanItemInterface[];
  content?: PlanItemContentInterface;  // Populated by PlanHelper
  providerId?: string;  // Provider that owns this item's content
  providerPath?: string;  // Path to fetch instructions from provider
  providerContentPath?: string;  // Dot-notation path to specific content item (e.g. "0.2.1")
  thumbnailUrl?: string;
}
