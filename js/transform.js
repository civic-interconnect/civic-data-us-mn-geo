/**
 * Transformation functions for Minnesota precinct data
 * Converts from MN SOS format to unified format
 *
 * File: js/transform.js
 */

// Shared CRS constant for all unified outputs
const CRS84 = {
  type: "name",
  properties: {
    name: "urn:ogc:def:crs:OGC:1.3:CRS84",
  },
};

let manifest = null;
try {
  manifest = require("../manifest.json");
} catch (err) {
  if (typeof console !== "undefined") {
    console.warn(
      "[transform] Could not load manifest.json, using default property map."
    );
  }
}

/**
 * Get propertyMap from manifest if available
 * */
const manifestPropertyMap =
  manifest &&
  manifest.layers &&
  manifest.layers.precincts &&
  manifest.layers.precincts.schema &&
  manifest.layers.precincts.schema.propertyMap
    ? manifest.layers.precincts.schema.propertyMap
    : {
        precinct_id: "PrecinctID",
        precinct_name: "Precinct",
        county: "County",
        us_house: "CongDist",
        mn_senate: "MNSenDist",
        mn_house: "MNLegDist",
        county_commission: "CtyComDist",
      };

/**
 * Transform property names from MN SOS format to unified format
 * */
function transformProperties(mnProperties) {
  const out = {};
  for (const [unifiedKey, sourceKey] of Object.entries(manifestPropertyMap)) {
    out[unifiedKey] = mnProperties[sourceKey];
  }
  return out;
}

/**
 * Transform geometry from GeometryCollection/Polygon to MultiPolygon
 */
function transformGeometry(mnGeometry) {
  // Handle GeometryCollection
  if (mnGeometry.type === "GeometryCollection" && mnGeometry.geometries) {
    const polygons = mnGeometry.geometries.filter((g) => g.type === "Polygon");
    if (polygons.length > 0) {
      return {
        type: "MultiPolygon",
        coordinates: polygons.map((p) => p.coordinates),
      };
    }
  }

  // Handle single Polygon
  if (mnGeometry.type === "Polygon") {
    return {
      type: "MultiPolygon",
      coordinates: [mnGeometry.coordinates],
    };
  }

  // Already MultiPolygon or other type
  return mnGeometry;
}

/**
 * Transform a single feature from MN format to unified format
 */
function transformFeature(mnFeature) {
  return {
    type: "Feature",
    properties: transformProperties(mnFeature.properties),
    geometry: transformGeometry(mnFeature.geometry),
  };
}

/**
 * Transform an entire FeatureCollection from MN format to unified format
 */
function transformFeatureCollection(mnGeoJson) {
  return {
    type: "FeatureCollection",
    name: "full",
    crs: CRS84,
    features: mnGeoJson.features.map(transformFeature),
  };
}

/**
 * Merge multiple FeatureCollections into one
 */
function mergeFeatureCollections(featureCollections) {
  const allFeatures = [];

  featureCollections.forEach((fc) => {
    if (fc && fc.features) {
      allFeatures.push(...fc.features);
    }
  });

  return {
    type: "FeatureCollection",
    name: "full",
    crs: CRS84,
    features: allFeatures,
  };
}

// Export for testing
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    CRS84,
    manifestPropertyMap,
    transformProperties,
    transformGeometry,
    transformFeature,
    transformFeatureCollection,
    mergeFeatureCollections,
  };
}
