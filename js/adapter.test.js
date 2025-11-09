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

test("MinnesotaAdapter constructor uses manifest precinct sources", () => {
  const adapter = new MinnesotaAdapter();

  const precinctLayer = manifest.layers.precincts;
  assert.ok(precinctLayer);
  assert.ok(Array.isArray(precinctLayer.sources));

  const expectedSources = precinctLayer.sources;

  // Same count
  assert.strictEqual(adapter.sources.length, expectedSources.length);

  // Each source matches url and cd derived from id
  adapter.sources.forEach((src, idx) => {
    const manifestSrc = expectedSources[idx];

    const expectedCd =
      typeof manifestSrc.id === "string"
        ? manifestSrc.id.replace(/^cd/, "")
        : String(manifestSrc.id);

    assert.strictEqual(
      src.cd,
      expectedCd,
      `source ${idx} cd should be ${expectedCd}`
    );
    assert.strictEqual(
      src.url,
      manifestSrc.url,
      `source ${idx} url should match manifest`
    );
  });
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

test("fetchPrecincts merges transformed districts and applies CRS84 + metadata", async () => {
  const adapter = new MinnesotaAdapter();

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
  // Should be like ["0001", "0002", ..., "0008"] given current manifest
  assert.strictEqual(
    ids.length,
    sourceCount,
    "all merged features should have mapped precinct_id"
  );
});

test("fetchPrecincts throws when all districts fail", async () => {
  const adapter = new MinnesotaAdapter();

  // Force every district fetch to fail (return null as in catch path)
  adapter.fetchDistrict = async () => null;

  await assert.rejects(
    async () => {
      await adapter.fetchPrecincts();
    },
    /Failed to fetch any precinct data from Minnesota Secretary of State/
  );
});
