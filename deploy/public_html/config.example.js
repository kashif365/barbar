// Where the website finds the API. This file is per-server: deploys never overwrite the live copy
// (the build ships it as config.example.js). Edit it on the server; no rebuild needed.
// Same domain (API reachable at https://yourdomain.com/api): leave both as they are.
// API on a subdomain: apiBaseUrl: 'https://api.yourdomain.com/api', socketUrl: 'https://api.yourdomain.com'
// Optional: socketTransports: ['polling'] only if the host cannot carry WebSocket connections
// (default is WebSocket first, falling back to polling automatically).
window.SB_CONFIG = {
  apiBaseUrl: '/api',
  socketUrl: '',
};
