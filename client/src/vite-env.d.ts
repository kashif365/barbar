/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_SOCKET_URL?: string;
}
/** Runtime settings from public/config.js, editable on the server without rebuilding. */
interface Window {
  SB_CONFIG?: { apiBaseUrl?: string; socketUrl?: string; socketTransports?: string[] };
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
