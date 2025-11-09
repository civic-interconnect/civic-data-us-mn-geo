/**
 * Minnesota Precinct Data Adapter
 * Adapter for fetching and transforming Minnesota precinct data
 *
 * File: js/adapter.js
 */

const { CRS84, transformFeatureCollection } = require("./transform");

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
    // Prefer reading precinct sources from manifest.json
    const precinctLayer =
      manifest &&
      manifest.layers &&
      manifest.layers.precincts &&
      Array.isArray(manifest.layers.precincts.sources)
        ? manifest.layers.precincts
        : null;

    if (precinctLayer) {
      // Use manifest-driven definitions
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
    } else {
      // Fallback: Minnesota Secretary of State precinct file URLs
      this.sources = [
        {
          cd: "1",
          url: "https://www.sos.mn.gov/media/2785/mn-cd1-precincts.json",
        },
        {
          cd: "2",
          url: "https://www.sos.mn.gov/media/2786/mn-cd2-precincts.json",
        },
        {
          cd: "3",
          url: "https://www.sos.mn.gov/media/2787/mn-cd3-precincts.json",
        },
        {
          cd: "4",
          url: "https://www.sos.mn.gov/media/2788/mn-cd4-precincts.json",
        },
        {
          cd: "5",
          url: "https://www.sos.mn.gov/media/2789/mn-cd5-precincts.json",
        },
        {
          cd: "6",
          url: "https://www.sos.mn.gov/media/2790/mn-cd6-precincts.json",
        },
        {
          cd: "7",
          url: "https://www.sos.mn.gov/media/2791/mn-cd7-precincts.json",
        },
        {
          cd: "8",
          url: "https://www.sos.mn.gov/media/2792/mn-cd8-precincts.json",
        },
      ];
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
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      console.log(
        `Fetched MN CD${source.cd}: ${data.features.length} precincts`
      );
      return data;
    } catch (error) {
      console.error(`Failed to fetch MN CD${source.cd}:`, error.message);
      return null;
    }
  }

  /**
   * Main method: Fetch all Minnesota precinct data and return in unified format
   * This is what the civic-explorer app calls
   */
  async fetchPrecincts(options = {}) {
    console.log("Fetching Minnesota precinct data from Secretary of State...");

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
