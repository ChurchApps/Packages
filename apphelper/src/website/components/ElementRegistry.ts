import React from "react";
import type { ChurchInterface } from "@churchapps/helpers";
import { ElementInterface, SectionInterface } from "../helpers";

export interface ElementRenderProps {
  element: ElementInterface;
  church?: ChurchInterface;
  churchSettings: any;
  textColor: string;
  onEdit?: (section: SectionInterface | null, element: ElementInterface) => void;
  onMove?: () => void;
}

export type ElementRenderer = (props: ElementRenderProps) => React.ReactElement | null;

// Two layers so registration order never matters: app-level overrides always win
// over the built-in defaults registered by Element.tsx.
const defaults = new Map<string, ElementRenderer>();
const overrides = new Map<string, ElementRenderer>();

export const registerDefaultElementRenderer = (elementType: string, renderer: ElementRenderer) => { defaults.set(elementType, renderer); };
export const registerElementRenderer = (elementType: string, renderer: ElementRenderer) => { overrides.set(elementType, renderer); };
export const getElementRenderer = (elementType: string): ElementRenderer | undefined => overrides.get(elementType) || defaults.get(elementType);
export const getRegisteredElementTypes = (): string[] => Array.from(new Set([...defaults.keys(), ...overrides.keys()]));
