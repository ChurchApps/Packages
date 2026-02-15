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

export interface PCOSong {
  id: string;
  attributes: {
    title?: string;
    author?: string;
    copyright?: string;
    ccli_number?: string;
  };
}

export interface PCOArrangement {
  id: string;
  attributes: {
    name?: string;
    chord_chart_key?: string;
    bpm?: number;
    sequence?: string[];
  };
}

export interface PCOSection {
  label: string;
  lyrics: string;
}

export interface PCOAttachment {
  id: string;
  attributes: {
    filename: string;
    content_type?: string;
    url?: string;
  };
}
