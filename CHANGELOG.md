# Changelog

All notable changes to this project will be documented in this file.

The format follows **[Keep a Changelog](https://keepachangelog.com/en/1.1.0/)**
and this project adheres to **[Semantic Versioning](https://semver.org/spec/v2.0.0.html)**.

---

## [Unreleased]

### Added
- (placeholder) Notes for the next release.

---

## [1.0.2] - 2025-11-09

### Added
- **Functional adapter (js/adapter.js)** to fetch and transform precinct data.
- **Functional transformer (js/transform.js)** with manifest-driven schema mapping.


---

## [1.0.1] - 2025-11-08

### Changed
- **Clarified licensing and provenance.**
  - Updated README, LICENSE, and CITATION.cff to specify that precinct geometries
    are obtained from the Minnesota Secretary of State and not redistributed.
  - Added clear description of derived materials licensed under CC BY 4.0.

---

## [1.0.0] - 2025-11-08

### Added
- **Initial**

---

## Notes on versioning and releases

- **SemVer policy**
  - **MAJOR** - breaking API/schema or CLI changes.
  - **MINOR** - backward-compatible additions and enhancements.
  - **PATCH** - documentation, tooling, or non-breaking fixes.
- Versions are driven by git tags via `setuptools_scm`.
  Tag the repository with `vX.Y.Z` to publish a release.
- Documentation and badges are updated per tag and aliased to **latest**.

[Unreleased]: https://github.com/civic-interconnect/civic-data-boundaries-us-mn/compare/v1.0.2...HEAD
[1.0.2]: https://github.com/civic-interconnect/civic-data-boundaries-us-mn/releases/tag/v1.0.2
[1.0.1]: https://github.com/civic-interconnect/civic-data-boundaries-us-mn/releases/tag/v1.0.1
[1.0.0]: https://github.com/civic-interconnect/civic-data-boundaries-us-mn/releases/tag/v1.0.0
