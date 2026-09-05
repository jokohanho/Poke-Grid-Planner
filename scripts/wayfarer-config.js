// The one runtime source of truth for the Wayfarer website.
(function (global) {
  'use strict';

  const host = 'wayfarer.scopely.com';
  const origin = `https://${host}`;
  const mapPath = '/new/mapview';

  function parseUrl(value) {
    try { return new URL(value); } catch (_) { return null; }
  }

  const WAYFARER_CONFIG = Object.freeze({
    host,
    origin,
    mapPath,
    matchPattern: `*://${host}/*`,
    isWayfarerUrl(url) {
      const parsed = parseUrl(url);
      return !!parsed && parsed.protocol === 'https:' && parsed.hostname === host;
    },
    isWayfarerMapUrl(url) {
      const parsed = parseUrl(url);
      return !!parsed && parsed.protocol === 'https:' && parsed.hostname === host && parsed.pathname === mapPath;
    },
    getMapUrl() { return `${origin}${mapPath}`; }
  });

  global.S2Wayfarer = WAYFARER_CONFIG;
})(globalThis);
