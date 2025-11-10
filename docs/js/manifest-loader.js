/**
 * Minimal boundary fetcher for THIS data repo.
 * Pipeline:
 * 1) load manifest.json (local file in repo)
 * 2) read layer definition
 * 3) use statewide URL or per-CD sources
 * 4) fetch via proxy + transform using shared schema
 * 5) return unified FeatureCollection
 */

import { fetchStateResource } from "./proxy-fetch.js";
import {
  transformFeatureCollection,
  CRS84,
} from "../../src/shared/transform.js";

export async function fetchGeoLayerForRegion(
  countryCode,
  regionCode,
  layerName = "precincts"
) {
  // 1) load manifest.json from this repo
  const manifestResp = await fetch("../manifest.json");
  if (!manifestResp.ok) {
    throw new Error(`Failed to load manifest.json: ${manifestResp.status}`);
  }
  const manifest = await manifestResp.json();

  // 2) get layer definition
  const layerDef = manifest.layers?.[layerName];
  if (!layerDef || !layerDef.available) {
    throw new Error(`Layer '${layerName}' not available in manifest.json`);
  }

  const schema = layerDef.schema || null;
  let features = [];

  // 3a) statewide URL path
  if (layerDef.url) {
    const raw = await fetchStateResource(layerDef.url); // already JSON
    const transformed = schema
      ? transformFeatureCollection(raw, schema)
      : raw;
    features = transformed.features;
  }
  // 3b) per-source / per-CD path
  else if (Array.isArray(layerDef.sources) && layerDef.sources.length > 0) {
    const results = await Promise.all(
      layerDef.sources.map(async (src) => {
        try {
          const raw = await fetchStateResource(src.url); // already JSON
          const transformed = schema
            ? transformFeatureCollection(raw, schema)
            : raw;
          return transformed.features;
        } catch (err) {
          console.warn(
            "[manifest-loader] Skipping",
            src.url,
            "-",
            err && err.message ? err.message : String(err)
          );
          return [];
        }
      })
    );
    features = results.flat();
  } else {
    throw new Error(
      `Layer '${layerName}' has neither url nor sources in manifest.json`
    );
  }

  // 4) return unified FC with metadata + CRS84
  return {
    type: "FeatureCollection",
    name: `${manifest.state?.code || regionCode}_${layerName}`,
    metadata: {
      country: countryCode,
      region: regionCode,
      state: manifest.state,
      metadata: manifest.metadata,
      version: manifest.version,
    },
    crs: CRS84,
    features,
  };
}
