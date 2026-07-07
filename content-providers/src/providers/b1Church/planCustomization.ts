import { InstructionItem, Instructions, MessageFileInterface } from "../../interfaces";
import { instructionItemMediaType } from "../../utils";
import { B1PlanItem } from "./B1ChurchTypes";

const SECTION_TYPES = new Set(["item", "section", "lessonSection", "providerSection"]);
const ACTION_TYPES = new Set(["action", "lessonAction", "providerPresentation", "lessonAddOn", "addon", "providerFile", "file"]);

function collectFilesFromNode(node: InstructionItem): MessageFileInterface[] {
  const files: MessageFileInterface[] = [];
  if (node.downloadUrl) {
    files.push({
      id: node.id,
      name: node.label || "",
      url: node.downloadUrl,
      fileType: instructionItemMediaType(node),
      seconds: node.seconds || 10
    });
  }
  if (node.children) {
    for (const child of node.children) files.push(...collectFilesFromNode(child));
  }
  return files;
}

function buildFileMaps(items: InstructionItem[]): { sectionMap: Map<string, MessageFileInterface[]>, itemMap: Map<string, MessageFileInterface[]> } {
  const sectionMap = new Map<string, MessageFileInterface[]>();
  const itemMap = new Map<string, MessageFileInterface[]>();

  const walk = (nodes: InstructionItem[]) => {
    for (const node of nodes) {
      const key = node.relatedId || node.id;
      if (key) {
        const files = collectFilesFromNode(node);
        if (node.itemType === "section") sectionMap.set(key, files);
        else if (files.length > 0) itemMap.set(key, files);
      }
      if (node.children) walk(node.children);
    }
  };
  walk(items);
  return { sectionMap, itemMap };
}

function collectRelatedIds(items: B1PlanItem[]): { id: string, itemType: string }[] {
  const out: { id: string, itemType: string }[] = [];
  const sorted = [...items].sort((a, b) => (a.sort || 0) - (b.sort || 0));
  for (const item of sorted) {
    const t = item.itemType || "";
    if (item.relatedId && (SECTION_TYPES.has(t) || ACTION_TYPES.has(t))) {
      out.push({ id: item.relatedId, itemType: t });
    }
    if (item.children?.length) out.push(...collectRelatedIds(item.children));
  }
  return out;
}

export function getOrderedFiles(instructions: Instructions, customPlanItems?: B1PlanItem[]): MessageFileInterface[] {
  const { sectionMap, itemMap } = buildFileMaps(instructions.items || []);

  if (customPlanItems && customPlanItems.length > 0) {
    const relatedIds = collectRelatedIds(customPlanItems);
    if (relatedIds.length > 0) {
      const result: MessageFileInterface[] = [];
      for (const { id, itemType } of relatedIds) {
        const files = SECTION_TYPES.has(itemType) ? sectionMap.get(id) : itemMap.get(id);
        if (files) result.push(...files);
      }
      if (result.length > 0) return result;
    }
  }

  const all: MessageFileInterface[] = [];
  for (const item of instructions.items || []) all.push(...collectFilesFromNode(item));
  return all;
}
