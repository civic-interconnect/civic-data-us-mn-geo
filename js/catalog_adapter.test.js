// js/catalog_adapter.test.js
// End-to-end style tests: catalog.json -> manifest.json -> MinnesotaAdapter

const test = require("node:test");
const assert = require("assert");

const MinnesotaAdapter = require("./adapter");
const { CRS84 } = require("./transform");
const catalog = require("../api/v1.0.0/catalog.json");
const manifest = require("../manifest.json");

// Helper: minimal MN-style properties
function makeMnProps(overrides = {}) {
  return {
    PrecinctID: "0001",
    Precinct: "Sample Precinct",
    County: "Sample County",
    CongDist: "7",
    MNSenDist: "3",
    MNLegDist: "3A",
    CtyComDist: "2",
    ...overrides,
  };
}

const SAMPLE_POLYGON = {
  type: "Polygon",
  coordinates: [
    [
      [-93.0, 45.0],
      [-93.1, 45.0],
      [-93.1, 45.1],
      [-93.0, 45.1],
      [-93.0, 45.0],
    ],
  ],
};

test("catalog.json lists Minnesota with correct repo and manifest_url", () => {
  assert.strictEqual(catalog.version, "1.0.0");
  assert.strictEqual(catalog.country, "us");

  assert.ok(Array.isArray(catalog.states));
  const mnEntry = catalog.states.find((s) => s.code === "MN");
  assert.ok(mnEntry, "Minnesota entry should exist in catalog.states");

  assert.strictEqual(mnEntry.name, "Minnesota");
  assert.strictEqual(mnEntry.repo, "civic-data-boundaries-us-mn");
  assert.strictEqual(
    mnEntry.repo_url,
    "https://github.com/civic-interconnect/civic-data-boundaries-us-mn"
  );

  // Basic shape of manifest_url
  assert.ok(
    typeof mnEntry.manifest_url === "string" &&
      mnEntry.manifest_url.includes("civic-data-boundaries-us-mn") &&
      mnEntry.manifest_url.endsWith("/manifest.json"),
    "manifest_url should point to manifest.json in this repo"
  );
});

test("catalog Minnesota entry is consistent with manifest.json", () => {
  const mnEntry = catalog.states.find((s) => s.code === "MN");
  assert.ok(mnEntry, "Minnesota entry should exist in catalog.states");

  // Manifest state block
  assert.ok(manifest.state);
  assert.strictEqual(
    manifest.state.name,
    "Minnesota",
    "manifest.state.name should be Minnesota"
  );
  assert.strictEqual(
    manifest.state.code.toLowerCase(),
    mnEntry.code.toLowerCase(),
    "state code should match between manifest and catalog"
  );

  // Layers intersection (we only require that 'precincts' is present)
  assert.ok(Array.isArray(mnEntry.layers));
  assert.ok(
    mnEntry.layers.includes("precincts"),
    "catalog layers should include 'precincts'"
  );

  assert.ok(manifest.layers);
  assert.ok(manifest.layers.precincts);
});

test("catalog -> MinnesotaAdapter -> unified data pipeline works (sources mode)", async () => {
  const mnEntry = catalog.states.find((s) => s.code === "MN");
  assert.ok(mnEntry, "Minnesota entry should exist in catalog.states");

  // In a real app, you would:
  // 1) Fetch catalog
  // 2) Pick state entry
  // 3) Use state.repo/state.code to decide which adapter to instantiate
  // Here, we just instantiate MinnesotaAdapter directly.
  const adapter = new MinnesotaAdapter();

  // For this test, we specifically want to exercise the per-CD "sources" path,
  // independent of whether the manifest has a statewide 'url'.
  adapter.mode = "sources";
  adapter.sources = [
    { cd: "1", url: "https://example.com/cd1" },
    { cd: "2", url: "https://example.com/cd2" },
    { cd: "3", url: "https://example.com/cd3" },
  ];

  // Silence log noise for this test
  const originalLog = console.log;
  console.log = () => {};

  try {
    // Mock fetchDistrict so we do not hit the network
    adapter.fetchDistrict = async (source) => {
      const precinctId = source.cd.toString().padStart(4, "0");
      return {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: makeMnProps({ PrecinctID: precinctId }),
            geometry: SAMPLE_POLYGON,
          },
        ],
      };
    };

    const unified = await adapter.fetchPrecincts();

    // High-level expectations
    assert.strictEqual(unified.type, "FeatureCollection");
    assert.strictEqual(unified.name, "full");
    assert.strictEqual(unified.crs, CRS84);

    // Metadata should match adapter.getMetadata
    const meta = adapter.getMetadata();
    assert.deepStrictEqual(unified.metadata, meta);

    // State info in manifest and metadata should be consistent
    assert.strictEqual(unified.metadata.state, "MN");
    assert.strictEqual(
      manifest.state.name,
      unified.metadata.stateName || "Minnesota"
    );

    // One feature per source
    const sourceCount = adapter.sources.length;
    assert.strictEqual(unified.features.length, sourceCount);

    const ids = unified.features
      .map((f) => f.properties.precinct_id)
      .filter((id) => id !== undefined)
      .sort();

    assert.strictEqual(ids.length, sourceCount);
    // Spot-check first ID format
    assert.ok(
      /^\d{4}$/.test(ids[0]),
      "precinct_id should look like zero-padded string"
    );
  } finally {
    console.log = originalLog;
  }
});
