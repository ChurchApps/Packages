import createCache from "@emotion/cache";

const isBrowser = typeof document !== "undefined";

// Ensures MUI styles load first so other styling solutions can override them.
export function createEmotionCache() {
  let insertionPoint;

  if (isBrowser) {
    const emotionInsertionPoint = document.querySelector<HTMLMetaElement>('meta[name="emotion-insertion-point"]');
    insertionPoint = emotionInsertionPoint ?? undefined;
  }

  return createCache({ key: "mui-style", insertionPoint });
}
