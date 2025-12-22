# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.1] - 2025-12-22

### Fixed
- **React iframe context compatibility**: Fixed "Invalid hook call" errors in browser extension iframe contexts (devtools panels, popups, options pages)
  - Transform hook now skips injection for entry point files (`main`, `index`, `App`) in the `entrypoints/` directory to prevent React module resolution issues
  - Uses exact basename matching instead of substring matching to avoid false positives (e.g., `domain.ts` containing "main")
  - Each iframe window patches its own console independently, ensuring logs forward correctly from all contexts

### Added
- **React devtools panel example**: Added example devtools panel with React hooks to verify iframe compatibility
- **Regression test**: Added Playwright test to catch React hook errors in iframe contexts

## [1.3.0] - 2025-12-21

### Added
- **ANSI color conversion**: Browser console `%c` format specifiers with CSS colors are now converted to ANSI terminal colors
- **Format specifier parsing**: Supports `%c` (CSS styles), `%s` (substitutions), and `%%` (literal percent)
- **CSS color support**: Handles hex (`#RGB`, `#RRGGBB`), `rgb()`, named colors, and reset keywords (`inherit`, `initial`, `unset`, `revert`)
- **Bun.color integration**: Uses `Bun.color()` for robust CSS-to-ANSI conversion with fallback for non-Bun environments
- **Unit tests**: Comprehensive test suite for format specifier parsing and color conversion

### Fixed
- **Color leaking prevention**: Each `%c` resets to default if no usable color is provided, matching browser behavior
- **TTY-independent output**: Uses `ansi-16m` format for consistent colored output regardless of terminal detection

## [1.2.0] - 2025-12-13

### Added
- **Debug module integration**: Example extension now demonstrates using the `debug` module with console forwarding
- **Headless extension testing**: Playwright tests now support headless mode using Chrome's `--headless=new` flag
- **HEADED environment variable**: Run tests with visible browser using `HEADED=1 bun run test`

### Fixed
- **Sourcemap generation**: Transform hook now generates proper sourcemaps using `magic-string`, fixing Vite's "sourcemap is likely to be incorrect" warning
- **MV3 CSP compliance**: Removed HTML inline script injection to avoid Content Security Policy violations in Chrome MV3 extension pages
- **External scripts for CSP**: Use external virtual modules instead of inline scripts for HTML entrypoints

### Changed
- **Playwright tests updated for MV3**: Tests now use `context.serviceWorkers()` instead of deprecated `backgroundPages()` for Manifest V3 extensions
- **Improved test locators**: Tests use resilient `getByRole()` and `getByText()` locators per Playwright best practices
- **README corrections**: Fixed module usage example (string name instead of import), updated Vite version requirements

### Dependencies
- Added `magic-string` ^0.30.21 for sourcemap generation

## [1.1.0] - 2025-01-05

### Added
- **WXT dev server port configuration support**: Module now properly respects the `dev.server.port` setting from `wxt.config.ts` instead of defaulting to port 3000
- **Improved logging**: Added clear logging messages showing which dev server URL is being used

### Changed
- **Simplified port detection**: Removed complex port detection logic that parsed command line arguments in favor of using WXT's resolved configuration directly
- **Better error handling**: Added assertion to ensure dev server configuration is available during module setup

### Fixed
- **Port configuration bug**: Fixed issue where the module would always use port 3000 regardless of the configured port in `wxt.config.ts`
- **TypeScript type errors**: Fixed various TypeScript issues in server.listen call
- **Duplicate console forwarding**: Implemented singleton pattern to prevent duplicate initialization
- **Specifier error**: Resolved 'specifier.indexOf is not a function' error in module resolution

### Technical Improvements
- Removed unused imports and variables
- Simplified Vite plugin by removing unnecessary server configuration hooks
- Better code organization and cleaner implementation

## [1.0.0] - 2024-12-XX

### Added
- Initial release of WXT Console Forward Module
- Support for forwarding console logs from all web extension contexts (background, content, popup, inpage)
- Automatic injection of console forwarding code
- Context identification and labeling
- Object and array serialization
- Stack trace forwarding
- Error and promise rejection handling
- Configurable logging levels and endpoints
- Development mode only operation for security
- Comprehensive example extension

### Features
- Virtual module system integration with Vite
- Log buffering for performance
- CORS support for cross-origin requests
- Singleton pattern to prevent duplicate initialization
- Support for excluding specific entrypoints
- Silent error mode option