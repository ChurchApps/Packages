export interface LinkInterface {
  id?: string;
  churchId?: string;
  url?: string;
  text?: string;
  sort?: number;
  linkType: string;
  linkData: string;
  icon: string;
  category: string;
  parentId?: string;
  children?: any;
}
export interface SermonInterface {
  id?: string;
  churchId?: string;
  playlistId?: string;
  videoType?: string;
  videoData?: string;
  videoUrl?: string;
  title?: string;
  description?: string;
  publishDate?: Date;
  thumbnail?: string;
  duration?: number;
  permanentUrl?: boolean;
}
export interface PlaylistInterface {
  id?: string;
  churchId?: string;
  title?: string;
  description?: string;
  publishDate?: Date;
  thumbnail?: string;
}
export interface StreamingServiceInterface {
  id?: string;
  churchId?: string;
  serviceTime?: Date;
  earlyStart?: number;
  duration: number;
  chatBefore: number;
  chatAfter: number;
  provider: string;
  providerKey: string;
  videoUrl: string;
  timezoneOffset: number;
  recurring: boolean;
  label: string;
  sermonId?: string;
}
export interface EventInterface {
  id?: string;
  churchId?: string;
  groupId?: string;
  start?: Date;
  end?: Date;
  title?: string;
  description?: string;
  allDay?: boolean;
  visibility?: string;
  recurrenceRule?: string;
  exceptionDates?: Date[];
}
export interface EventExceptionInterface {
  id?: string;
  churchId?: string;
  eventId?: string;
  exceptionDate?: Date;
}
export interface CuratedCalendarInterface {
  id?: string;
  churchId?: string;
  name?: string;
}
export interface CuratedEventInterface {
  id?: string;
  churchId?: string;
  curratedCalendarId?: string;
  groupId?: string;
  eventId?: string;
}
export interface CuratedEventWithEventInterface extends EventInterface, CuratedEventInterface {}
export type VisibilityOptions = "public" | "private" | "hidden";
