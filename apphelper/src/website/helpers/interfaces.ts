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

/**
 * Extended version of StreamingServiceInterface for API responses and client-side usage.
 * The base StreamingServiceInterface uses typed Date/number fields, but API responses
 * return strings that need parsing. This interface adds:
 * - String representations of time fields (serviceTime, earlyStart, chatBefore, chatAfter)
 * - Computed client-side Date properties (local*) for UI display
 */
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
  customCss?: string;
  customJS?: string;
}
