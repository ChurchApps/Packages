import { Instructions, InstructionItem } from "./interfaces";

/**
 * Navigate to a specific item using a dot-notation path.
 * Path format: "0.2.1" means items[0].children[2].children[1]
 */
export function navigateToPath(instructions: Instructions, path: string): InstructionItem | null {
  if (!path || !instructions?.items) return null;

  const indices = path.split(".").map(Number);
  if (indices.some(isNaN)) return null;

  let current: InstructionItem | null = instructions.items[indices[0]] || null;

  for (let i = 1; i < indices.length && current; i++) {
    current = current.children?.[indices[i]] || null;
  }

  return current;
}

/**
 * Generate a path string for an item given its position in the tree.
 * Used when selecting an item to store its path.
 */
export function generatePath(indices: number[]): string {
  return indices.join(".");
}
