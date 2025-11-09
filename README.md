# Civic Data Boundaries Adapter: U.S. Minnesota

[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.17560655.svg)](https://zenodo.org/records/17560655)
[![License: CC BY 4.0](https://img.shields.io/badge/license-CC--BY--4.0-green.svg)](https://creativecommons.org/licenses/by/4.0/)
[![Validate Catalog](https://github.com/civic-interconnect/civic-data-boundaries-us-mn/actions/workflows/validate.yml/badge.svg)](https://github.com/civic-interconnect/civic-data-boundaries-us-mn/actions/workflows/validate.yml)

> Data adapter, metadata, and transformation functions for Minnesota boundary data.
> Converts Minnesota Secretary of State GeoJSON into a unified Civic Interconnect schema.

## Adapter

This repository provides a data adapter for Minnesota boundary data.
It translates the Minnesota Secretary of State's GeoJSON format into a unified, cross-state schema.

Specifically, it includes:

- Metadata describing where to fetch official precinct data
- Transformation functions to convert Minnesota source fields into the unified Civic Interconnect schema
- Configuration files supporting reproducible, schema-validated builds

## Benefits

- Fetches data directly from official public sources
- Normalizes state-specific formats into a consistent national structure
- Uses declarative, data-driven mappings so many updates require no code changes


## Machine-Readable Catalog

For programmatic discovery, see the machine-readable API catalog:

- API catalog:  
  `https://raw.githubusercontent.com/civic-interconnect/civic-data-boundaries-us-mn/main/api/v1.0.0/catalog.json`

## Transformation Functions

The `js/transform.js` file provides pure, read-only functions that convert Minnesota GeoJSON into the unified Civic Interconnect schema:

- transformProperties(mnProperties) - maps property names to unified schema
- transformGeometry(mnGeometry) - converts GeometryCollection/Polygon to MultiPolygon
- transformFeature(mnFeature) - transforms a single feature
- transformFeatureCollection(mnGeoJson) - transforms an entire collection
- mergeFeatureCollections(featureCollections) - merges multiple congressional district files

Each function creates new immutable objects without modifying the original input.

## Source and Licensing

Official precinct boundary data are published by the  
[Minnesota Secretary of State](https://www.sos.mn.gov/election-administration-campaigns/data-maps/voting-precincts/)  
through the **Maps and Geodata** resources (e.g., Voting Precincts Shapefiles and GeoJSON) at <https://www.sos.mn.gov/media/2791/mn-precincts.json>.

The Secretary of State website does **not specify an open data license**.

This repository and associated Zenodo record:

- Reference, without redistributing, the official precinct geometry files.
- Provide metadata, schemas, and configuration files for reproducible standardization.
- License derivative documentation and configuration files under  
  [Creative Commons Attribution 4.0 International (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/).

Users should review and comply with the Minnesota Secretary of State Terms & Conditions when accessing the original data.

See `CITATION.cff` for citation details.
