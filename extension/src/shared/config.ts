// Central place for environment-specific configuration.
//
// IMPORTANT: If you change API_BASE_ORIGIN, you must also update the
// matching entry in `extension/manifest.json` -> `host_permissions`.
// Manifest V3 requires the API's origin to be declared there, or the
// background service worker's fetch() calls will be blocked. See
// docs/API_CONTRACT.md ("CORS / extension access") for why the extension
// talks to the API directly instead of going through a CORS proxy.
export const API_BASE_ORIGIN = "http://localhost:8080";
export const API_BASE_URL = `${API_BASE_ORIGIN}/api`;
