/**
 * Shared transform utilities for Node and browser.
 * Absolutely NO environment-specific APIs here.
 *
 * File: src/shared/transform.js (functional works with Node and Browser)
 */

// CRS84 is useful to attach to outputs if desired
export const CRS84 = {
  type: "name",
  properties: {
    name: "urn:ogc:def:crs:OGC:1.3:CRS84",
  },
};

/**
 * Map properties from sourceProps using a propertyMap.
 * propertyMap is something like:
 * {
 *   precinct_id: "PrecinctID",
 *   precinct_name: "Precinct",
 *   county: "County",
 *   us_house: "CongDist",
 *   ...
 * }
 *  */
export function transformProperties(sourceProps = {}, propertyMap = {}) {
  const out = {};
  for (const [targetKey, sourceKey] of Object.entries(propertyMap)) {
    out[targetKey] = sourceProps[sourceKey];
  }
  return out;
}

/**
 * Normalize geometry using a simple declarative transformType.
 * Right now we support:
 *   - "geometryCollection_to_multiPolygon"
 *   - or "none"
 */
export function transformGeometry(geometry, transformType = "none") {
  if (!geometry) return geometry;

  if (transformType === "geometryCollection_to_multiPolygon") {
    // GeometryCollection -> MultiPolygon (using just the polygons)
    if (
      geometry.type === "GeometryCollection" &&
      Array.isArray(geometry.geometries)
    ) {
      const polygons = geometry.geometries.filter((g) => g.type === "Polygon");
      if (polygons.length > 0) {
        return {
          type: "MultiPolygon",
          coordinates: polygons.map((p) => p.coordinates),
        };
      }
    }

    // Single Polygon -> MultiPolygon
    if (geometry.type === "Polygon") {
      return {
        type: "MultiPolygon",
        coordinates: [geometry.coordinates],
      };
    }

    // Already MultiPolygon or something else -> pass through
    return geometry;
  }

  // No transform or unknown type
  return geometry;
}

/**
 * Transform a single feature using a schema like:
 * {
 *   propertyMap: { ... },
 *   geometryTransform: "geometryCollection_to_multiPolygon"
 * }
 */
export function transformFeature(feature, schema = {}) {
  const propertyMap = schema.propertyMap || {};
  const geometryTransform = schema.geometryTransform || "none";

  const sourceProps = feature.properties || {};
  const transformedProps = transformProperties(sourceProps, propertyMap);
  const transformedGeom = transformGeometry(
    feature.geometry,
    geometryTransform
  );

  return {
    type: "Feature",
    properties: transformedProps,
    geometry: transformedGeom,
  };
}

/**
 * Transform an entire FeatureCollection using a schema.
 * The input FC can be raw SOS-style; the output will be in unified form.
 */
export function transformFeatureCollection(featureCollection, schema = {}) {
  if (!featureCollection || !Array.isArray(featureCollection.features)) {
    throw new Error("transformFeatureCollection: invalid FeatureCollection");
  }

  const transformedFeatures = featureCollection.features.map((f) =>
    transformFeature(f, schema)
  );

  return {
    type: "FeatureCollection",
    name: "full",
    crs: CRS84,
    features: transformedFeatures,
  };
}

/**
 * Merge already-unified FeatureCollections into one big FC.
 * All inputs are expected to have features in unified schema already.
 */
export function mergeFeatureCollections(collections) {
  const allFeatures = [];

  for (const fc of collections) {
    if (fc && Array.isArray(fc.features)) {
      allFeatures.push(...fc.features);
    }
  }

  return {
    type: "FeatureCollection",
    name: "full",
    crs: CRS84,
    features: allFeatures,
  };
}
