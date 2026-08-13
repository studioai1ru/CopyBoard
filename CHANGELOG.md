# Changelog

All notable user-visible changes to CopyBoard are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Added a theme-aware top-edge drawer for copying favorite templates from anywhere on the primary screen.

### Changed

- Added a System appearance mode that follows the operating system and is used by default on new installations and after resetting settings.

### Fixed

- Copying a favorite template now refreshes it at the top of clipboard history, including copies made from the tray and top-edge drawer.
- Clipboard history cards now highlight the full card in green after a successful copy.

## [1.0.5] - 2026-08-13

### Changed

- CopyBoard now uses a lightweight Tauri shell while preserving the existing interface, clipboard history, favorites, tray controls, shortcuts, and local settings.
- Existing data from the previous Electron version is imported automatically on first launch.

### Fixed

- Windows autostart now launches CopyBoard itself instead of the Electron development runtime.

## [1.0.4] - 2026-08-13

### Fixed

- The Esc key now closes the active menu, preview window, or form in sequence before minimizing the application to the system tray.

## [1.0.3] - 2026-08-13

### Fixed

- Card scaling with Ctrl and the mouse wheel now immediately accounts for the actual column count after the window is resized.
- The Codex release action now works with Node.js 24 on Windows, validates the project, saves current changes to Git, creates a patch version, and pushes it to GitHub.

## [1.0.2] - 2026-08-13

### Fixed

- Changelog release dates now use the local calendar date instead of UTC.
- Codex environment actions now run correctly through the configured Windows terminal.

## [1.0.1] - 2026-08-13

### Added

- Added permanent README download links for the latest Windows and macOS installers.
- Added a project changelog and release-history rules.
- Added a Codex `Release Patch` environment action.

### Changed

- Installer filenames are now stable so the README links always resolve to the latest GitHub Release.

## [1.0.0] - 2026-08-13

### Added

- Initial public release of CopyBoard for Windows and macOS.
- Clipboard history for text, code, and images with search and content filters.
- Reusable favorites with configurable display modes and drag-and-drop ordering.
- Light and dark appearance modes, Russian and English interfaces, system tray integration, global shortcuts, autostart, and local persistence.
- Configurable clipboard-card grids with responsive sizing.
- Automated Windows EXE and universal macOS DMG builds through GitHub Actions.
