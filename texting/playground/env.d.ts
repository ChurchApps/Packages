/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEFAULT_PROVIDER: string;
  readonly VITE_CLEARSTREAM_API_KEY: string;
  readonly VITE_API_BASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
