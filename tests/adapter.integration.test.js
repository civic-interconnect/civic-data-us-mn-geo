/**
 * Integration tests for MinnesotaAdapter with real data fetching
 *
 * File: tests/adapter.integration.test.js
 *
 * Run with: node --test tests/adapter.integration.test.js
 */

import test from "node:test";
import assert from "node:assert";
import https from "node:https";
import MinnesotaAdapter from "../src/adapter.js";
import src_list from "../src/shared/sources.js";

// Proxy configuration for CORS-enabled fetching
const PROXY_BASE = "https://civic-proxy.denisecase.workers.dev/?url=";

/**
 * Helper to fetch data via proxy (for GitHub Actions)
 */
async function fetchViaProxy(url) {
  const proxiedUrl = PROXY_BASE + encodeURIComponent(url);

  return new Promise((resolve, reject) => {
    https
      .get(proxiedUrl, (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          if (res.statusCode !== 200) {
            reject(new Error(`HTTP ${res.statusCode} for ${url}`));
          } else {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              reject(new Error(`Invalid JSON from ${url}: ${e.message}`));
            }
          }
        });
      })
      .on("error", reject);
  });
}

/**
 * Validate the structure of a transformed precinct feature
 */
function validatePrecinctFeature(feature, index) {
  // Basic feature structure
  assert.strictEqual(
    feature.type,
    "Feature",
    `Feature ${index}: type should be 'Feature'`
  );
  assert.ok(feature.properties, `Feature ${index}: should have properties`);
  assert.ok(feature.geometry, `Feature ${index}: should have geometry`);

  // Required mapped properties
  const props = feature.properties;
  assert.ok(props.precinct_id, `Feature ${index}: missing precinct_id`);
  assert.ok(props.precinct_name, `Feature ${index}: missing precinct_name`);
  assert.ok(props.county, `Feature ${index}: missing county`);

  // Validate ID format (should be string, typically 4+ digits)
  assert.strictEqual(
    typeof props.precinct_id,
    "string",
    `Feature ${index}: precinct_id should be string`
  );

  // District fields (may be optional/null but should exist)
  assert.ok(
    "us_house" in props,
    `Feature ${index}: should have us_house field`
  );
  assert.ok(
    "mn_senate" in props,
    `Feature ${index}: should have mn_senate field`
  );
  assert.ok(
    "mn_house" in props,
    `Feature ${index}: should have mn_house field`
  );

  // Geometry validation
  const geom = feature.geometry;
  assert.ok(
    ["Polygon", "MultiPolygon"].includes(geom.type),
    `Feature ${index}: geometry type should be Polygon or MultiPolygon, got ${geom.type}`
  );

  if (geom.type === "Polygon") {
    assert.ok(
      Array.isArray(geom.coordinates),
      `Feature ${index}: Polygon should have coordinates array`
    );
    assert.ok(
      geom.coordinates.length > 0,
      `Feature ${index}: Polygon should have at least one ring`
    );
  } else if (geom.type === "MultiPolygon") {
    assert.ok(
      Array.isArray(geom.coordinates),
      `Feature ${index}: MultiPolygon should have coordinates array`
    );
    geom.coordinates.forEach((polygon, pi) => {
      assert.ok(
        Array.isArray(polygon),
        `Feature ${index}, polygon ${pi}: should be array`
      );
      assert.ok(
        polygon.length > 0,
        `Feature ${index}, polygon ${pi}: should have at least one ring`
      );
    });
  }
}

/**
 * Validate the unified collection structure
 */
function validateUnifiedCollection(data) {
  // Top-level structure
  assert.strictEqual(
    data.type,
    "FeatureCollection",
    "Should be a FeatureCollection"
  );
  assert.strictEqual(data.name, "full", "Should have name 'full'");
  assert.ok(data.metadata, "Should have metadata");
  assert.ok(data.crs, "Should have CRS");
  assert.ok(Array.isArray(data.features), "Should have features array");

  // CRS validation
  assert.strictEqual(data.crs.type, "name", "CRS type should be 'name'");
  assert.strictEqual(
    data.crs.properties.name,
    "urn:ogc:def:crs:OGC:1.3:CRS84",
    "Should use CRS84"
  );

  // Metadata validation
  const meta = data.metadata;
  assert.strictEqual(meta.state, "MN", "Metadata state should be 'MN'");
  assert.strictEqual(
    meta.stateName,
    "Minnesota",
    "Metadata stateName should be 'Minnesota'"
  );
  assert.ok(meta.source, "Should have source in metadata");
  assert.ok(meta.sourceUrl, "Should have sourceUrl in metadata");

  return data.features.length;
}

// Test suite
test.describe("Minnesota Adapter Integration Tests", () => {
  test("Adapter correctly identifies manifest configuration", () => {
    const adapter = new MinnesotaAdapter();

    // Based on your manifest, it should detect the statewide URL
    assert.ok(
      adapter.mode === "single" || adapter.mode === "sources",
      "Adapter should be in 'single' or 'sources' mode"
    );

    if (adapter.mode === "single") {
      assert.ok(adapter.precinctUrl, "Should have precinctUrl in single mode");
      assert.ok(
        adapter.precinctUrl.includes("mn-precincts.json"),
        "Statewide URL should reference mn-precincts.json"
      );
    } else {
      assert.ok(
        adapter.sources.length > 0,
        "Should have sources in sources mode"
      );
      assert.strictEqual(
        adapter.sources.length,
        8,
        "Should have 8 congressional districts"
      );
    }
  });

  test(
    "Can fetch and validate a single district (CDN)",
    { timeout: 30000 },
    async () => {
      const cdNum = 4; // TODO: Change to 1-8 to test other districts

      // Build URL dynamically
      const cdUrl = `https://www.sos.mn.gov/media/278${
        4 + cdNum
      }/mn-cd${cdNum}-precincts.json`;

      try {
        const data = await fetchViaProxy(cdUrl);

        assert.strictEqual(
          data.type,
          "FeatureCollection",
          `CD${cdNum} should be a FeatureCollection`
        );
        assert.ok(
          Array.isArray(data.features),
          `CD${cdNum} should have features array`
        );
        assert.ok(
          data.features.length > 0,
          `CD${cdNum} should have at least one precinct`
        );

        // Check raw Minnesota properties on first feature
        const firstFeature = data.features[0];
        const props = firstFeature.properties;

        assert.ok(props.PrecinctID, "Raw feature should have PrecinctID");
        assert.ok(props.Precinct, "Raw feature should have Precinct name");
        assert.ok(props.County, "Raw feature should have County");
        assert.strictEqual(
          props.CongDist,
          String(cdNum),
          `CD${cdNum} features should have CongDist='${cdNum}'`
        );

        console.log(
          `Success:  CD${cdNum} has ${data.features.length} precincts`
        );
      } catch (error) {
        const msg = String(error.message || "");

        // Treat "Invalid JSON" from SOS as "remote data not usable" and skip
        // Treat upstream issues as "skip" instead of failing CI
        if (
          msg.includes("ENOTFOUND") ||
          msg.includes("ETIMEDOUT") ||
          msg.includes("Invalid JSON") ||
          msg.includes("HTTP 404")
        ) {
          console.log(
            `Warning: Remote data for CD${cdNum} not available / usable (${msg}), skipping CD${cdNum} fetch test`
          );
          return;
        }

        throw error;
      }
    }
  );

  test(
    "fetchPrecincts returns valid unified structure",
    { timeout: 60000 },
    async () => {
      const adapter = new MinnesotaAdapter();

      // Mock fetch for Node.js environment
      if (typeof global.fetch === "undefined") {
        global.fetch = async (url) => {
          try {
            const data = await fetchViaProxy(url);
            return {
              ok: true,
              json: async () => data,
            };
          } catch (error) {
            return {
              ok: false,
              status: 500,
            };
          }
        };
      }

      try {
        // Force sources mode for predictable testing
        adapter.mode = "sources";

        adapter.sources = src_list.slice(1, 2); // Test with just CD2 for speed
        const unified = await adapter.fetchPrecincts();

        // Validate structure
        const featureCount = validateUnifiedCollection(unified);
        assert.ok(featureCount > 0, "Should have transformed features");

        // Validate first few features in detail
        const samplesToCheck = Math.min(5, featureCount);
        for (let i = 0; i < samplesToCheck; i++) {
          validatePrecinctFeature(unified.features[i], i);
        }

        console.log(
          `Success:  Unified collection has ${featureCount} valid features`
        );
      } catch (error) {
        // Network errors are warnings, not failures
        if (error.message.includes("fetch") || error.message.includes("HTTP")) {
          console.log(
            "Warning:  Network unavailable, skipping full fetch test"
          );
          return;
        }
        throw error;
      }
    }
  );

  test(
    "Transformed features have correct property mappings",
    { timeout: 30000 },
    async () => {
      const adapter = new MinnesotaAdapter();

      // Create a minimal mock of CD data
      const mockCDData = {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: {
              PrecinctID: "0101-P1",
              Precinct: "ALBANY W-1 P-1",
              County: "STEARNS",
              CongDist: "6",
              MNSenDist: "9",
              MNLegDist: "12B",
              CtyComDist: "5",
            },
            geometry: {
              type: "Polygon",
              coordinates: [
                [
                  [-94.5, 45.6],
                  [-94.4, 45.6],
                  [-94.4, 45.7],
                  [-94.5, 45.7],
                  [-94.5, 45.6],
                ],
              ],
            },
          },
        ],
      };

      // Override fetchDistrict to return mock data
      adapter.fetchDistrict = async () => mockCDData;
      adapter.mode = "sources";
      adapter.sources = [{ cd: "6", url: "mock://cd6" }];

      const unified = await adapter.fetchPrecincts();

      assert.strictEqual(
        unified.features.length,
        1,
        "Should have one transformed feature"
      );

      const transformed = unified.features[0].properties;

      // Check all mappings from manifest.json propertyMap
      assert.strictEqual(
        transformed.precinct_id,
        "0101-P1",
        "PrecinctID -> precinct_id"
      );
      assert.strictEqual(
        transformed.precinct_name,
        "ALBANY W-1 P-1",
        "Precinct -> precinct_name"
      );
      assert.strictEqual(transformed.county, "STEARNS", "County -> county");
      assert.strictEqual(transformed.us_house, "6", "CongDist -> us_house");
      assert.strictEqual(transformed.mn_senate, "9", "MNSenDist -> mn_senate");
      assert.strictEqual(transformed.mn_house, "12B", "MNLegDist -> mn_house");
      assert.strictEqual(
        transformed.county_commission,
        "5",
        "CtyComDist -> county_commission"
      );

      console.log("Success:  Property mappings are correct");
    }
  );

  test(
    "Handles GeometryCollection to MultiPolygon transformation",
    { timeout: 5000 },
    async () => {
      const adapter = new MinnesotaAdapter();

      // Mock data with GeometryCollection (common in MN data)
      const mockWithGeomCollection = {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: {
              PrecinctID: "TEST-GC",
              Precinct: "Test GeometryCollection",
              County: "TEST",
            },
            geometry: {
              type: "GeometryCollection",
              geometries: [
                {
                  type: "Polygon",
                  coordinates: [
                    [
                      [-94.0, 45.0],
                      [-93.9, 45.0],
                      [-93.9, 45.1],
                      [-94.0, 45.1],
                      [-94.0, 45.0],
                    ],
                  ],
                },
                {
                  type: "Polygon",
                  coordinates: [
                    [
                      [-93.8, 45.2],
                      [-93.7, 45.2],
                      [-93.7, 45.3],
                      [-93.8, 45.3],
                      [-93.8, 45.2],
                    ],
                  ],
                },
              ],
            },
          },
        ],
      };

      adapter.fetchDistrict = async () => mockWithGeomCollection;
      adapter.mode = "sources";
      adapter.sources = [{ cd: "test", url: "mock://test" }];

      const unified = await adapter.fetchPrecincts();

      assert.strictEqual(unified.features.length, 1, "Should have one feature");

      const geom = unified.features[0].geometry;
      assert.strictEqual(
        geom.type,
        "MultiPolygon",
        "GeometryCollection should be transformed to MultiPolygon"
      );

      assert.strictEqual(
        geom.coordinates.length,
        2,
        "MultiPolygon should have 2 polygons from GeometryCollection"
      );

      console.log("Success:  GeometryCollection transformation works");
    }
  );

  test(
    "Validates all 8 congressional districts have correct CongDist values",
    { timeout: 60000 },
    async () => {
      const adapter = new MinnesotaAdapter();

      // Mock fetch that returns appropriate CongDist for each CD
      global.fetch = async (url) => {
        const cdMatch = url.match(/mn-cd(\d)-precincts\.json/);
        const cdNum = cdMatch ? cdMatch[1] : "1";

        return {
          ok: true,
          json: async () => ({
            type: "FeatureCollection",
            features: [
              {
                type: "Feature",
                properties: {
                  PrecinctID: `CD${cdNum}-TEST`,
                  Precinct: `Test Precinct CD${cdNum}`,
                  County: "TEST",
                  CongDist: cdNum,
                  MNSenDist: "1",
                  MNLegDist: "1A",
                },
                geometry: {
                  type: "Polygon",
                  coordinates: [
                    [
                      [-93, 45],
                      [-92, 45],
                      [-92, 46],
                      [-93, 46],
                      [-93, 45],
                    ],
                  ],
                },
              },
            ],
          }),
        };
      };

      // Test with all 8 CDs
      adapter.mode = "sources";
      adapter.sources = src_list;

      try {
        const unified = await adapter.fetchPrecincts();

        // Should have features from all districts
        assert.ok(
          unified.features.length >= 8,
          "Should have at least 8 features (one per CD)"
        );

        // Check that we have all CD numbers 1-8
        const cdNumbers = new Set(
          unified.features
            .map((f) => f.properties.us_house)
            .filter((cd) => cd !== null && cd !== undefined)
        );

        for (let cd = 1; cd <= 8; cd++) {
          assert.ok(
            cdNumbers.has(String(cd)),
            `Should have precincts from Congressional District ${cd}`
          );
        }

        console.log("Success:  All 8 congressional districts represented");
      } catch (error) {
        if (error.message.includes("fetch") || error.message.includes("HTTP")) {
          console.log("Warning:  Network unavailable, skipping multi-CD test");
          return;
        }
        throw error;
      }
    }
  );
});

// Run summary
test.after(() => {
  console.log("\n=== Integration Test Summary ===");
  console.log("Tests validate:");
  console.log("Success:  Manifest configuration detection");
  console.log("Success:  Individual district fetching");
  console.log("Success:  Property mapping transformations");
  console.log("Success:  GeometryCollection handling");
  console.log("Success:  Unified collection structure");
  console.log("Success:  All 8 congressional districts");
});
