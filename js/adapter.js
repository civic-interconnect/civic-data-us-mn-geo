/**
 * Minnesota Precinct Data Adapter
 * Adapter for fetching and transforming Minnesota precinct data
 *
 * File: js/adapter.js
 */

const { CRS84, transformFeatureCollection } = require("./transform");
const src_list = require("./sources");

let manifest = null;
try {
  manifest = require("../manifest.json");
} catch (err) {
  if (typeof console !== "undefined") {
    console.warn(
      "[MinnesotaAdapter] Could not load manifest.json, falling back to hard-coded sources."
    );
  }
}

class MinnesotaAdapter {
  constructor() {
    const precinctLayer =
      manifest && manifest.layers && manifest.layers.precincts
        ? manifest.layers.precincts
        : null;

    // NEW: decide mode based on manifest
    // - mode = "single": use statewide URL (mn-precincts.json)
    // - mode = "sources": use per-CD sources array
    // - fallback: hard-coded CD URLs
    this.mode = "sources";
    this.precinctUrl = null;
    this.sources = [];

    if (precinctLayer && precinctLayer.url) {
      // Prefer the statewide combined URL if present
      this.mode = "single";
      this.precinctUrl = precinctLayer.url;
      console.log(
        "[MinnesotaAdapter] Using statewide precinct URL from manifest:",
        this.precinctUrl
      );
    } else if (
      precinctLayer &&
      Array.isArray(precinctLayer.sources) &&
      precinctLayer.sources.length > 0
    ) {
      // Use manifest-driven per-CD sources
      this.mode = "sources";
      this.sources = precinctLayer.sources.map((src) => {
        return {
          // Keep a simple numeric cd from the manifest id (e.g. "cd1" -> "1")
          cd:
            typeof src.id === "string"
              ? src.id.replace(/^cd/, "")
              : String(src.id),
          url: src.url,
        };
      });
      console.log(
        "[MinnesotaAdapter] Using",
        this.sources.length,
        "precinct sources from manifest"
      );
    } else {
      // Fallback: Minnesota Secretary of State precinct file URLs (per-CD)
      this.mode = "sources";

      this.sources = src_list;
      console.log(
        "[MinnesotaAdapter] Using fallback hard-coded CD sources:",
        this.sources.map((s) => s.cd).join(", ")
      );
    }
  }

  /**
   * Get metadata about this data source
   */
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

  /**
   * Fetch a single congressional district's data
   */
  async fetchDistrict(source) {
    try {
      const response = await fetch(source.url);
      console.log(`[fetchDistrict] Fetching MN CD${source.cd} from ${source.url}`);

      const start_of_response = (await response.text()).slice(0, 100);
      console.log(`[fetchDistrict] Response: ${start_of_response}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      console.log(
        `Fetched MN CD${source.cd}: ${data.features.length} precincts`
      );
      return data;
    } catch (error) {
      console.error(
        `Failed to fetch MN CD${source.cd} (${source.url}):`,
        error.message
      );
      return null;
    }
  }

  /**
   * NEW: fetch statewide precincts from a single URL (mn-precincts.json)
   */
  async fetchStatewide(options = {}) {
    if (!this.precinctUrl) {
      throw new Error(
        "[MinnesotaAdapter] fetchStatewide called without precinctUrl"
      );
    }

    console.log(
      "[MinnesotaAdapter] Fetching statewide precinct data from",
      this.precinctUrl
    );

    const response = await fetch(this.precinctUrl);
    console.log(`[MinnesotaAdapter] Fetched statewide precincts from ${this.precinctUrl}`);

    const start_of_response = (await response.text()).slice(0, 100);
    console.log(`[MinnesotaAdapter] Response: ${start_of_response}`);
    
    if (!response.ok) {
      throw new Error(
        `[MinnesotaAdapter] Statewide fetch failed: HTTP ${response.status}`
      );
    }

    const rawData = await response.json();
    const transformed = transformFeatureCollection(rawData);

    const unifiedData = {
      ...transformed,
      metadata: this.getMetadata(),
    };

    console.log(
      `[MinnesotaAdapter] Transformed ${unifiedData.features.length} statewide precincts`
    );

    return unifiedData;
  }

  /**
   * Main method: Fetch all Minnesota precinct data and return in unified format
   * This is what the civic-explorer app calls
   */
  async fetchPrecincts(options = {}) {
    console.log("Fetching Minnesota precinct data from Secretary of State...");

    // If we have a statewide URL, prefer that path
    if (this.mode === "single" && this.precinctUrl) {
      return this.fetchStatewide(options);
    }

    // Otherwise, use per-district sources (manifest or fallback)
    if (!this.sources || this.sources.length === 0) {
      throw new Error(
        "[MinnesotaAdapter] No precinct sources configured (neither statewide nor per-CD)"
      );
    }

    // Fetch all congressional districts in parallel
    const fetchPromises = this.sources.map((source) =>
      this.fetchDistrict(source)
    );
    const results = await Promise.all(fetchPromises);

    // Filter out any failed fetches
    const validData = results.filter((d) => d !== null);

    if (validData.length === 0) {
      throw new Error(
        "Failed to fetch any precinct data from Minnesota Secretary of State"
      );
    }

    console.log(
      `Successfully fetched ${validData.length} of ${this.sources.length} congressional districts`
    );

    // Transform and merge all data
    const allFeatures = [];

    validData.forEach((districtData) => {
      const transformed = transformFeatureCollection(districtData);
      allFeatures.push(...transformed.features);
    });

    // Return unified collection
    const unifiedData = {
      type: "FeatureCollection",
      name: "full",
      metadata: this.getMetadata(),
      crs: CRS84,
      features: allFeatures,
    };

    console.log(
      `Transformed ${unifiedData.features.length} total Minnesota precincts`
    );

    return unifiedData;
  }
}

// Export for use by civic-explorer
if (typeof module !== "undefined" && module.exports) {
  module.exports = MinnesotaAdapter;
} else {
  // For browser use
  window.MinnesotaAdapter = MinnesotaAdapter;
}
