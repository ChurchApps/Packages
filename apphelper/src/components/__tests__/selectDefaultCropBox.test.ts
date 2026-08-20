import { describe, expect, it } from "vitest";
import { selectDefaultCropBox } from "../selectDefaultCropBox";

describe("selectDefaultCropBox", () => {
  it("fills a canvas that already matches the target aspect", () => {
    expect(selectDefaultCropBox({ left: 0, top: 0, width: 800, height: 200 }, 4)).toEqual({
      left: 0, top: 0, width: 800, height: 200
    });
  });

  it("is height-limited when the canvas is wider than the target", () => {
    // 800x100 is 8:1; target 4:1 uses full height and centers horizontally
    expect(selectDefaultCropBox({ left: 10, top: 20, width: 800, height: 100 }, 4)).toEqual({
      left: 10 + (800 - 400) / 2,
      top: 20,
      width: 400,
      height: 100
    });
  });

  it("is width-limited when the canvas is taller than the target (logo 4:1 on a ~2:1 canvas)", () => {
    // Common logo case: cropper letterboxed a ~2:1 image in a square-ish editor, target 4:1
    expect(selectDefaultCropBox({ left: 0, top: 40, width: 480, height: 240 }, 4)).toEqual({
      left: 0,
      top: 40 + (240 - 120) / 2,
      width: 480,
      height: 120
    });
  });

  it("centers a 1:1 favicon crop inside a letterboxed canvas", () => {
    expect(selectDefaultCropBox({ left: 80, top: 0, width: 240, height: 240 }, 1)).toEqual({
      left: 80, top: 0, width: 240, height: 240
    });
  });
});
