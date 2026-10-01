import { NetworkInstance } from "../../interfaces";

export const DEFAULT_SLIDE_SECONDS = 5;

export type FreeShowDiscoverer = () => Promise<NetworkInstance[]>;

interface FreeShowMedia {
  name?: string;
  path?: string;
  type?: string;
  loop?: boolean;
}

interface FreeShowSlide {
  group?: string | null;
  items?: unknown[];
}

export interface FreeShowLayoutSlide {
  id: string;
  background?: string;
  nextTimer?: number;
  disabled?: boolean;
  end?: boolean;
  actions?: { nextAfterMedia?: boolean };
}

interface FreeShowLayout {
  name?: string;
  slides?: FreeShowLayoutSlide[];
}

export interface FreeShowShow {
  id?: string;
  name?: string;
  settings?: { activeLayout?: string };
  slides?: Record<string, FreeShowSlide>;
  layouts?: Record<string, FreeShowLayout>;
  media?: Record<string, FreeShowMedia>;
}
