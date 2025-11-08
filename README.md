# Minnesota Geographic Data

[![License: CC BY 4.0](https://img.shields.io/badge/license-CC--BY--4.0-green.svg)](https://creativecommons.org/licenses/by/4.0/)
[![Validate Status](https://github.com/civic-interconnect/civic-data-boundaries-us-mn/actions/workflows/validate.yml/badge.svg)](https://github.com/civic-interconnect/civic-data-boundaries-us-mn/actions/workflows/validate.yml)

> Boundary datasets for Minnesota, optimized for use in web and research applications.

## Quick Start
```javascript
// Fetch latest precincts
const url = 'https://raw.githubusercontent.com/civic-interconnect/civic-data-boundaries-us-mn/main/data/precincts/latest/web.geojson';
const precincts = await fetch(url).then(r => r.json());
```

## Machine-Readable Catalog

For programmatic discovery, see:

- API catalog:  
  `https://raw.githubusercontent.com/civic-interconnect/civic-data-boundaries-us-mn/main/api/v1.0.0/catalog.json`
- US index (latest):  
  `https://raw.githubusercontent.com/civic-interconnect/civic-data-boundaries-us-mn/main/data/us/latest/index.json`
- Minnesota index:  
  `https://raw.githubusercontent.com/civic-interconnect/civic-data-boundaries-us-mn/main/data/us/mn/index.json`


## License and Citation

This dataset is released under the [Creative Commons Attribution 4.0 International (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/) license.  
Boundary data is derived from public records provided by the **Minnesota Secretary of State** and the **Minnesota Department of Education**.

See `CITATION.cff` for full citation details.
