import type { SermonInterface } from "@churchapps/helpers";

export interface StreamingButtonInterface {
  text: string;
  url: string;
}

export interface StreamingTabInterface {
  text: string;
  url: string;
  icon: string;
  type: string;
  data: string;
  updated?: boolean;
}

/** Extended version for API responses with string time fields and computed local Date properties for UI display. */
export interface StreamingServiceExtendedInterface {
  videoUrl: string;
  serviceTime: string;
  earlyStart: string;
  chatBefore: string;
  chatAfter: string;
  provider: string;
  providerKey: string;
  localCountdownTime?: Date;
  localStartTime?: Date;
  localEndTime?: Date;
  localChatStart?: Date;
  localChatEnd?: Date;
  label: string;
  id?: string;
  sermon?: SermonInterface;
}

export interface StreamConfigInterface {
  keyName?: string;
  churchId?: string;
  buttons?: StreamingButtonInterface[];
  tabs?: StreamingTabInterface[];
  services?: StreamingServiceExtendedInterface[];
  switchToConversationId?: string;
  jitsiRoom?: string;
}

export interface GlobalStyleInterface {
  id?: string;
  churchId?: string;
  fonts?: string;
  palette?: any;
  typography?: string;
  spacing?: string;
  borderRadius?: string;
  navStyles?: string;
  customCss?: string;
  customJS?: string;
}
