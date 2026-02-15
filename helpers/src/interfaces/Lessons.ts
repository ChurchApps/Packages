// Interfaces for Lessons API responses (tree structures)

export interface LessonActionInterface {
  id: string;
  name: string;
  actionType: string;
  roleName?: string;
  seconds?: number;
}

export interface LessonSectionInterface {
  id: string;
  name: string;
  actions?: LessonActionInterface[];
}

export interface LessonVenueInterface {
  id: string;
  name: string;
  sections?: LessonSectionInterface[];
}

export interface LessonInfoInterface {
  id: string;
  name: string;
  venues?: LessonVenueInterface[];
}

export interface LessonStudyInterface {
  id: string;
  name: string;
  lessons?: LessonInfoInterface[];
}

export interface LessonProgramInterface {
  id: string;
  name: string;
  studies?: LessonStudyInterface[];
}

// Response from /lessons/public/tree
export interface LessonTreeInterface {
  programs?: LessonProgramInterface[];
}

// Response from /lessons/public/actionTree (same structure as LessonTreeInterface)
export interface LessonActionTreeInterface {
  programs?: LessonProgramInterface[];
}

// Response from /venues/public/actions/{id}
export interface VenueActionResponseInterface {
  venueName?: string;
  sections?: LessonSectionInterface[];
}

// Response from /venues/public/planItems/{id}
export interface VenuePlanItemsResponseInterface {
  venueName?: string;
  items?: import("./Doing.js").PlanItemInterface[];
}
