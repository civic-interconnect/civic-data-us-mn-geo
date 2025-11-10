/**
 * Proxy base URL for fetching remote state data.
 * In production, may need to create a dedicated proxy service.
 * For demo app, we use a public proxy.
 *
 * File: docs/js/proxy-fetch.js
 */

const PROXY_BASE = "https://civic-proxy.denisecase.workers.dev/?url=";

// Basic helper: fetch via proxy for remote state data
export async function fetchStateResource(url) {
  const proxied = PROXY_BASE + encodeURIComponent(url);
  const startedAt = Date.now();

  const response = await fetch(proxied);
  const text = await response.text();

  // record basic metadata for app.js
  window.__MN_GEO_CACHE_LAST_SOURCE = {
    url,
    proxiedUrl: proxied,
    status: response.status,
    timestamp: startedAt,
    fromCache: response.headers.get("cf-cache-status") === "HIT",
  };

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: HTTP ${response.status}`);
  }

  // If the body looks like HTML, it's almost certainly a WAF / captcha page
  const trimmed = text.trim();
  if (trimmed.startsWith("<!DOCTYPE") || trimmed.startsWith("<html")) {
    throw new Error(
      `Remote returned HTML (likely WAF/captcha) instead of GeoJSON for ${url}`
    );
  }

  let json;
  try {
    json = JSON.parse(text);
  } catch (e) {
    throw new Error(`Invalid JSON from ${url}: ${e.message}`);
  }

  return json;
}
