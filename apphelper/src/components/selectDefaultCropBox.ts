export interface CropCanvasRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Largest crop box of `desiredAspect` that fits inside the on-screen canvas rect, centered. */
export function selectDefaultCropBox(canvas: CropCanvasRect, desiredAspect: number): CropCanvasRect {
  let width: number;
  let height: number;
  if (canvas.width / canvas.height > desiredAspect) {
    height = canvas.height;
    width = height * desiredAspect;
  } else {
    width = canvas.width;
    height = width / desiredAspect;
  }
  return {
    width,
    height,
    left: canvas.left + (canvas.width - width) / 2.0,
    top: canvas.top + (canvas.height - height) / 2.0
  };
}
