export interface ResponsiveImgProps {
  src: string;
  srcSet?: string;
  sizes?: string;
}

export interface ImageOptimizer {
  img: (url: string, sizes?: string) => ResponsiveImgProps;
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
