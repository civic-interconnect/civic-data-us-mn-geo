/**
 * Minnesota Precinct Data Adapter
 * Adapter for fetching and transforming Minnesota precinct data
 *
 * File: src/adapter.js (Node)
 */

import { CRS84, transformFeatureCollection, mergeFeatureCollections } from "./shared/transform.js";
import manifest from "../manifest.json" with { type: "json" };
import SOURCE_LIST from "./shared/sources.js";

class MinnesotaAdapter {
  constructor() {
    const precinctLayer = manifest.layers?.precincts || null;

    this.mode = "sources";
    this.precinctUrl = null;
    this.sources = SOURCE_LIST;

    if (precinctLayer && precinctLayer.url) {
      this.mode = "single";
      this.precinctUrl = precinctLayer.url;
    } else if (precinctLayer && Array.isArray(precinctLayer.sources)) {
      this.mode = "sources";
      this.sources = precinctLayer.sources.map((src) => ({
        cd: typeof src.id === "string" ? src.id.replace(/^cd/, "") : String(src.id),
        url: src.url,
      }));
    } else {
      // fallback hard-coded CD URLs 
      this.mode = "sources";
      this.sources = SOURCE_LIST;
    }

    // Keep the schema handy
    this.schema = precinctLayer?.schema || null;
  }

  getMetadata() {
    return {
      state: "MN",
      stateName: "Minnesota",
      source: "Minnesota Secretary of State",
      sourceUrl:
        "https://www.sos.mn.gov/election-administration-campaigns/data-maps/voting-precincts/",
      license: "No explicit license - Terms & Conditions apply",
      layers: ["precincts"],
      note: "Data must be fetched directly from official source, not redistributed",
    };
  }

  async fetchDistrict(source) {
    const response = await fetch(source.url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    return data;
  }

  async fetchStatewide() {
    if (!this.precinctUrl) {
      throw new Error("[MinnesotaAdapter] fetchStatewide called without precinctUrl");
    }
    const response = await fetch(this.precinctUrl);
    if (!response.ok) {
      throw new Error(`Statewide fetch failed: HTTP ${response.status}`);
    }
    const raw = await response.json();

    const transformed = this.schema
      ? transformFeatureCollection(raw, this.schema)
      : raw;

    return {
      type: "FeatureCollection",
      name: "full",
      metadata: this.getMetadata(),
      crs: CRS84,
      features: transformed.features,
    };
  }

  async fetchPrecincts() {
    if (this.mode === "single" && this.precinctUrl) {
      return this.fetchStatewide();
    }

    if (!this.sources || this.sources.length === 0) {
      throw new Error("[MinnesotaAdapter] No precinct sources configured");
    }

    const fetchPromises = this.sources.map((s) =>
      this.fetchDistrict(s).catch(() => null)
    );
    const results = (await Promise.all(fetchPromises)).filter(Boolean);
    if (results.length === 0) {
      throw new Error("Failed to fetch any precinct data");
    }

    // Transform each district FC, then merge
    const transformed = results.map((fc) =>
      this.schema ? transformFeatureCollection(fc, this.schema) : fc
    );
    const merged = mergeFeatureCollections(transformed);

    return {
      type: "FeatureCollection",
      name: "full",
      metadata: this.getMetadata(),
      crs: CRS84,
      features: merged.features,
    };
  }
}

export default MinnesotaAdapter;
