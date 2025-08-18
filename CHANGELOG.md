# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0] - 2025-08-18
### Added
- First public release: lightweight PWA with Agendamento, Delivery and Táxi Dog flows.
- Service Worker with offline fallback and cache-first strategy for static assets.
- End-to-end automation: full flows, accessibility checks and a scenario matrix.

### Changed
- Bumped package version to `0.1.0`.
- SW version set to `fa-0.1.1` (forces cache refresh on deploy).
- Robust “Adicionar outro pet” handler for real-world click edge cases.
- Delivery quantity/cart handlers stabilized.
- SEO: `robots.txt` and `sitemap.xml` updated to GitHub Pages URL.

### Notes
- Hosted under GitHub Pages; `config.json` is fetched relatively to support subpaths.
- If you see stale assets after deploy, refresh once to update the SW.
