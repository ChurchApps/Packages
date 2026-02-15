export interface B1Ministry {
  id: string;
  churchId: string;
  name: string;
  photoUrl?: string;
  tags?: string;
}

export interface B1PlanType {
  id: string;
  churchId: string;
  ministryId: string;
  name: string;
}

export interface B1Plan {
  id: string;
  churchId: string;
  ministryId?: string;
  planTypeId?: string;
  name: string;
  serviceDate: string;
  contentType?: string;
  contentId?: string;
  providerId?: string;       // Associated provider ID (e.g., "lessonschurch")
  providerPlanId?: string;   // Content path for associated lesson
  providerPlanName?: string; // Display name of associated lesson
}

export interface B1PlanItem {
  id: string;
  label?: string;
  description?: string;
  seconds?: number;
  itemType?: string;
  relatedId?: string;
  churchId?: string;
  providerId?: string;
  providerPath?: string;
  providerContentPath?: string;
  link?: string;
  children?: B1PlanItem[];
}

export interface ArrangementKeyResponse {
  arrangementKey?: {
    id: string;
    keySignature?: string;
  };
  arrangement?: {
    id: string;
    name?: string;
    lyrics?: string;
  };
  song?: {
    id: string;
    dateAdded?: string;
    notes?: string;
  };
  songDetail?: {
    title?: string;
    artist?: string;
    seconds?: number;
    keySignature?: string;
  };
}
