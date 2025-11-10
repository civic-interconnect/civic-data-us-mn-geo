/**
 * Application script to test fetchGeoLayerForRegion function
 * Path: docs/js/app.js
 * 
 */

import { fetchGeoLayerForRegion } from "./manifest-loader.js";

const logEl = document.getElementById("log");
const log = (...args) => {
  console.log(...args);
  logEl.textContent += args.join(" ") + "\n";
};

(async () => {
  try {
    log("[test] Calling fetchGeoLayerForRegion('us','mn','precincts')...");
    const fc = await fetchGeoLayerForRegion("us", "mn", "precincts");

    // cache/network info
    const info = window.__MN_GEO_CACHE_LAST_SOURCE;
    if (info && info.url) {
      const when = new Date(info.timestamp).toISOString();
      if (info.fromCache) {
        log(
          `[test] Warning: Using cached data for ${info.url} (stored ${when})`
        );
      } else {
        log(
          `[test] Success: Fetched fresh data for ${info.url} at ${when}`
        );
      }
    } else {
      log("[test] (No cache metadata available)");
    }

    log("[test] Result type:", fc.type);
    log("[test] Name:", fc.name || "(none)");
    log("[test] Features:", fc.features?.length || 0);

    if (fc.features && fc.features.length > 0) {
      const sample = fc.features[0].properties || {};
      log("[test] Sample properties:");
      log(JSON.stringify(sample, null, 2));
    }

    log("[test] Success.");
  } catch (err) {
    log("[test] ERROR:", err && err.message ? err.message : String(err));
  }
})();
