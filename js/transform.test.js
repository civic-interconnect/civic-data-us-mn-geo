// js/transform.test.js
// Tests for js/transform.js using Node's built-in test runner

const test = require("node:test");
const assert = require("assert");

const {
  CRS84,
  manifestPropertyMap,
  transformProperties,
  transformGeometry,
  transformFeature,
  transformFeatureCollection,
  mergeFeatureCollections,
} = require("./transform");

// Helper: basic MN-style properties
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

// Helper: simple polygon geometry
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

test("CRS84 constant has expected structure", () => {
  assert.strictEqual(CRS84.type, "name");
  assert.ok(CRS84.properties);
  assert.strictEqual(
    CRS84.properties.name,
    "urn:ogc:def:crs:OGC:1.3:CRS84"
  );
});

test("manifestPropertyMap includes expected keys", () => {
  // We do not assert exact equality, just that our expected unified keys exist.
  // If the manifest changes, you can update these expectations.
  const keys = Object.keys(manifestPropertyMap);

  ["precinct_id", "precinct_name", "county", "us_house"].forEach((key) => {
    assert.ok(
      keys.includes(key),
      `manifestPropertyMap should include key ${key}`
    );
  });
});

test("transformProperties maps MN SOS properties to unified keys", () => {
  const mnProps = makeMnProps();
  const unified = transformProperties(mnProps);

  // These expectations match the fallback map and current manifest
  assert.deepStrictEqual(unified, {
    precinct_id: "0001",
    precinct_name: "Sample Precinct",
    county: "Sample County",
    us_house: "7",
    mn_senate: "3",
    mn_house: "3A",
    county_commission: "2",
  });
});

test("transformProperties returns undefined for missing MN fields", () => {
  const mnProps = makeMnProps({ PrecinctID: undefined });
  const unified = transformProperties(mnProps);

  assert.strictEqual(unified.precinct_id, undefined);
  assert.strictEqual(unified.precinct_name, "Sample Precinct");
});

test("transformGeometry converts Polygon to MultiPolygon", () => {
  const result = transformGeometry(SAMPLE_POLYGON);
  assert.strictEqual(result.type, "MultiPolygon");
  assert.ok(Array.isArray(result.coordinates));
  assert.deepStrictEqual(result.coordinates, [SAMPLE_POLYGON.coordinates]);
});

test("transformGeometry converts GeometryCollection of Polygons to MultiPolygon", () => {
  const gc = {
    type: "GeometryCollection",
    geometries: [
      SAMPLE_POLYGON,
      {
        type: "Point",
        coordinates: [-93.05, 45.05],
      },
    ],
  };

  const result = transformGeometry(gc);
  assert.strictEqual(result.type, "MultiPolygon");
  assert.strictEqual(result.coordinates.length, 1);
  assert.deepStrictEqual(result.coordinates[0], SAMPLE_POLYGON.coordinates);
});

test("transformGeometry passes through existing MultiPolygon", () => {
  const multi = {
    type: "MultiPolygon",
    coordinates: [[[[-93, 45], [-93.1, 45], [-93, 45]]]],
  };

  const result = transformGeometry(multi);
  assert.strictEqual(result, multi);
});

test("transformFeature combines property and geometry transformations", () => {
  const mnFeature = {
    type: "Feature",
    properties: makeMnProps(),
    geometry: SAMPLE_POLYGON,
  };

  const out = transformFeature(mnFeature);
  assert.strictEqual(out.type, "Feature");
  assert.deepStrictEqual(out.properties.precinct_id, "0001");
  assert.strictEqual(out.geometry.type, "MultiPolygon");
});

test("transformFeatureCollection wraps features and applies CRS84", () => {
  const fc = {
    type: "FeatureCollection",
    name: "original",
    features: [
      {
        type: "Feature",
        properties: makeMnProps({ PrecinctID: "0001" }),
        geometry: SAMPLE_POLYGON,
      },
      {
        type: "Feature",
        properties: makeMnProps({ PrecinctID: "0002" }),
        geometry: SAMPLE_POLYGON,
      },
    ],
  };

  const result = transformFeatureCollection(fc);

  assert.strictEqual(result.type, "FeatureCollection");
  assert.strictEqual(result.name, "full");
  assert.strictEqual(result.crs, CRS84);
  assert.strictEqual(result.features.length, 2);
  assert.strictEqual(result.features[0].properties.precinct_id, "0001");
  assert.strictEqual(result.features[1].properties.precinct_id, "0002");
});

/**
 * Merge multiple FeatureCollections (already in unified schema) into one
 */
test("mergeFeatureCollections merges features and applies CRS84", () => {
  // Build MN-style raw collections
  const rawFc1 = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: makeMnProps({ PrecinctID: "0001" }),
        geometry: SAMPLE_POLYGON,
      },
    ],
  };

  const rawFc2 = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: makeMnProps({ PrecinctID: "0002" }),
        geometry: SAMPLE_POLYGON,
      },
    ],
  };

  // Transform them first, as the real pipeline would
  const fc1 = transformFeatureCollection(rawFc1);
  const fc2 = transformFeatureCollection(rawFc2);

  const result = mergeFeatureCollections([fc1, null, fc2]);

  assert.strictEqual(result.type, "FeatureCollection");
  assert.strictEqual(result.name, "full");
  assert.strictEqual(result.crs, CRS84);
  assert.strictEqual(result.features.length, 2);

  const ids = result.features.map((f) => f.properties.precinct_id).sort();
  assert.deepStrictEqual(ids, ["0001", "0002"]);
});
