import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const dir = dirname(fileURLToPath(import.meta.url));
const read = (rel: string) => readFileSync(join(dir, rel), "utf8");

describe("ImageEditor import graph", () => {
  it("does not import sibling components through the barrel", () => {
    const src = read("../ImageEditor.tsx");
    expect(src).not.toMatch(/from ["']\.["']/);
    expect(src).toContain('from "./InputBox"');
    expect(src).toContain('from "./SmallButton"');
    expect(src).toContain('from "./Loading"');
  });

  it("does not import cropper CSS at module scope", () => {
    const src = read("../ImageEditor.tsx");
    expect(src).not.toMatch(/^import ["']cropperjs\/dist\/cropper\.css["']/m);
    expect(src).toContain('import("cropperjs/dist/cropper.css")');
  });

  it("lazy-loads GalleryModal from the markdown toolbar", () => {
    const src = read("../../markdown/components/markdownEditor/plugins/ToolbarPlugin.tsx");
    expect(src).not.toMatch(/import \{ GalleryModal \} from/);
    expect(src).toContain("lazy(() => import(");
    expect(src).toContain("GalleryModal");
  });

  it("lazy-loads ImageEditor from GalleryModal", () => {
    const src = read("../gallery/GalleryModal.tsx");
    expect(src).not.toMatch(/import \{ ImageEditor \} from/);
    expect(src).toContain('import("../ImageEditor")');
  });
});
