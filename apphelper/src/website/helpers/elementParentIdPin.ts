// Compile-time pin: `yarn build` fails if ElementInterface.parentId stops accepting null.
// Not re-exported from the package entry.
import type { ElementInterface } from "./index";

export const topLevelElement: ElementInterface = { parentId: null };
