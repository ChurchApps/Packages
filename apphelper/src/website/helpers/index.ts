export interface StyleSet {
  all?: any;
  desktop?: any;
  mobile?: any;
}

export interface ElementInterface {
  id?: string;
  sectionId?: string;
  parentId?: string;
  blockId?: string;
  elementType?: string;
  sort?: number;
  answers?: any;
  answersJSON?: string;
  stylesJSON?: string;
  elements?: ElementInterface[];
  styles?: StyleSet;
  animations?: {
    onShow?: string;
    onShowSpeed?: string;
  };
  churchId?: string;
}

export interface SectionInterface {
  id?: string;
  elements?: ElementInterface[];
  answers?: any;
  styles?: StyleSet;
  [key: string]: any;
}

export * from "./StyleHelper";
export * from "./EnvironmentHelper";
export * from "./interfaces";
export * from "./StreamingServiceHelper";
export * from "./AnimationHelper";
