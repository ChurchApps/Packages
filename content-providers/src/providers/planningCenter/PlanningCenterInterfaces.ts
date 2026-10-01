export interface PCOServiceType {
  id: string;
  type: string;
  attributes: {
    name: string;
  };
}

export interface PCOPlan {
  id: string;
  type: string;
  attributes: {
    title?: string;
    sort_date: string;
    created_at: string;
    items_count: number;
  };
}

export interface PCOPlanItem {
  id: string;
  type: string;
  attributes: {
    item_type: string;
    title?: string;
    description?: string;
    length?: number;
  };
  relationships?: {
    song?: { data?: { id: string } };
    arrangement?: { data?: { id: string } };
  };
}
