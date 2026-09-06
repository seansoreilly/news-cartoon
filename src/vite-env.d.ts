/// <reference types="vite/client" />

declare const __GIT_HASH__: string;
declare const __GIT_BRANCH__: string;
declare const __BUILD_TIME__: string;

interface ImportMetaEnv {
  readonly VITE_ENV: string;
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_DEFAULT_NEWS_LIMIT?: string;
  readonly VITE_DEBUG?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}