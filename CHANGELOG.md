# Changelog

All notable changes to this project are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/lang/es/).

## [0.1.0] — 2026-11-10

### Added

- First public release of Factura Libre, a browser-only invoice app for Spanish autónomos and small businesses.
- Invoice editor with live A4 preview, IVA 21/10/4/0, IRPF 15/7/0 and optional recargo de equivalencia.
- Correlative numbering per series and year (`A-2026-0001`).
- NIF / NIE / CIF validation, issue date and operation date, rectificativas, paid / unpaid.
- PDF generation with pdf-lib and optional logo.
- Unsigned Facturae 3.2.2 XML export, clearly labelled as unsigned.
- Quarterly CSV helpers for modelo 303 and modelo 130.
- IndexedDB storage plus JSON backup export / import.
- Spanish-first UI with English toggle, light and dark mode.
- Fictional sample dataset and one-click “cargar ejemplo”.
- GitHub Pages demo, Docker / nginx image, and Hostinger static deploy docs.
- Vitest coverage for totals, rounding, numbering and tax IDs.

[0.1.0]: https://github.com/serg-hash/Factura-libre/releases/tag/v0.1.0
