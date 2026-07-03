import { Instructions, InstructionItem } from "./interfaces";

/** Navigate to a specific item using dot-notation path (e.g. "0.2.1" → items[0].children[2].children[1]). */
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
