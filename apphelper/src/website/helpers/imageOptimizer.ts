// Pluggable image-optimization seam. Host apps (B1App / Next.js) register an optimizer that
// produces responsive <img> props and optimized CSS backgrounds via the Next image pipeline.
// The default is identity, so the Vite editor and any non-Next host render plain images unchanged.

export interface ResponsiveImgProps {
  src: string;
  srcSet?: string;
  sizes?: string;
}

export interface ImageOptimizer {
  // Responsive props to spread onto an <img>.
  img: (url: string, sizes?: string) => ResponsiveImgProps;
  // A CSS background-image value: url('…') or image-set(…).
  background: (url: string) => string;
}

const identity: ImageOptimizer = {
  img: (url) => ({ src: url }),
  background: (url) => `url('${url}')`
};

let current: ImageOptimizer = identity;

export const setImageOptimizer = (optimizer: ImageOptimizer | null) => {
  current = optimizer || identity;
};

export const responsiveImgProps = (url: string, sizes?: string): ResponsiveImgProps =>
  url ? current.img(url, sizes) : { src: url };

export const optimizedBackgroundImage = (url: string): string =>
  url ? current.background(url) : `url('${url}')`;
