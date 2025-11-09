// js/adapter.test.js
// Tests for js/adapter.js using Node's built-in test runner

const test = require("node:test");
const assert = require("assert");

const MinnesotaAdapter = require("./adapter");
const { CRS84 } = require("./transform");
const manifest = require("../manifest.json");

// Shared helpers from transform tests

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

test("MinnesotaAdapter constructor uses statewide URL when present in manifest", () => {
  const adapter = new MinnesotaAdapter();

  const precinctLayer = manifest.layers.precincts;
  assert.ok(precinctLayer, "precinct layer should exist in manifest");

  // In the new manifest, we expect a statewide 'url'
  assert.ok(
    typeof precinctLayer.url === "string" && precinctLayer.url.length > 0,
    "precincts layer should have a statewide url"
  );

  // Adapter should detect and prefer the statewide URL
  assert.strictEqual(
    adapter.mode,
    "single",
    "adapter.mode should be 'single' when statewide url is present"
  );
  assert.strictEqual(
    adapter.precinctUrl,
    precinctLayer.url,
    "adapter.precinctUrl should match manifest.precincts.url"
  );
});

test("MinnesotaAdapter.getMetadata returns expected structure", () => {
  const adapter = new MinnesotaAdapter();
  const meta = adapter.getMetadata();

  assert.deepStrictEqual(meta, {
    state: "MN",
    stateName: "Minnesota",
    source: "Minnesota Secretary of State",
    sourceUrl:
      "https://www.sos.mn.gov/election-administration-campaigns/data-maps/voting-precincts/",
    license: "No explicit license - Terms & Conditions apply",
    layers: ["precincts"],
    note: "Data must be fetched directly from official source, not redistributed",
  });
});

test("fetchPrecincts uses statewide URL when in 'single' mode", async () => {
  const adapter = new MinnesotaAdapter();

  // Ensure we are in single-url mode for this test
  adapter.mode = "single";
  adapter.precinctUrl =
    manifest.layers.precincts.url || "https://example.com/mn-precincts.json";

  // Stub fetchStatewide so we don't hit real HTTP or transform
  const fakeResult = {
    type: "FeatureCollection",
    name: "full",
    crs: CRS84,
    metadata: adapter.getMetadata(),
    features: [{ type: "Feature", properties: {}, geometry: SAMPLE_POLYGON }],
  };

  let called = false;
  adapter.fetchStatewide = async (options) => {
    called = true;
    return fakeResult;
  };

  const unified = await adapter.fetchPrecincts();

  assert.ok(called, "fetchStatewide should be called in 'single' mode");
  assert.strictEqual(
    unified,
    fakeResult,
    "fetchPrecincts should return the result from fetchStatewide in 'single' mode"
  );
});

test("fetchPrecincts merges transformed districts and applies CRS84 + metadata in 'sources' mode", async () => {
  const adapter = new MinnesotaAdapter();

  // Force adapter into 'sources' mode with a custom set of sources
  adapter.mode = "sources";
  adapter.sources = [
    { cd: "1", url: "https://example.com/cd1" },
    { cd: "2", url: "https://example.com/cd2" },
    { cd: "3", url: "https://example.com/cd3" },
  ];

  // Override fetchDistrict to avoid real HTTP and to return minimal MN-style data.
  adapter.fetchDistrict = async (source) => {
    // Use source.cd to make precinct ids distinct per district
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

  // Top-level shape
  assert.strictEqual(unified.type, "FeatureCollection");
  assert.strictEqual(unified.name, "full");
  assert.strictEqual(unified.crs, CRS84);

  // Metadata from getMetadata
  const meta = adapter.getMetadata();
  assert.deepStrictEqual(unified.metadata, meta);

  // One feature per source
  const sourceCount = adapter.sources.length;
  assert.strictEqual(
    unified.features.length,
    sourceCount,
    "unified feature count should equal number of sources"
  );

  // Check that precinct_ids are present and distinct
  const ids = unified.features
    .map((f) => f.properties.precinct_id)
    .filter((id) => id !== undefined)
    .sort();

  assert.strictEqual(
    ids.length,
    sourceCount,
    "all merged features should have mapped precinct_id"
  );
});

test("fetchPrecincts throws when all districts fail in 'sources' mode", async () => {
  const adapter = new MinnesotaAdapter();

  // Force 'sources' mode with a non-empty sources list
  adapter.mode = "sources";
  adapter.sources = [
    { cd: "1", url: "https://example.com/cd1" },
    { cd: "2", url: "https://example.com/cd2" },
  ];

  // Force every district fetch to fail (return null as in catch path)
  adapter.fetchDistrict = async () => null;

  await assert.rejects(
    async () => {
      await adapter.fetchPrecincts();
    },
    /Failed to fetch any precinct data from Minnesota Secretary of State/
  );
});
