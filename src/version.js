// Injected at build time by vite.config.js (package.json version + git commit).
/* global __APP_VERSION__, __APP_BUILD__ */
export const VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '?';
export const BUILD = typeof __APP_BUILD__ !== 'undefined' ? __APP_BUILD__ : '';
export const VERSION_LABEL = `v${VERSION}${BUILD ? ` · ${BUILD}` : ''}`;
