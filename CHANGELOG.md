# Changelog

All notable user-visible changes to CopyBoard are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- Editing a favorite from the drawer now opens the edit form inside the drawer instead of revealing the main window.
- Favorite edits and deletions from either window now update the shared saved list and synchronize immediately everywhere.
- Turning off the drawer edge now closes the drawer and hides its handle while preserving a centered 20-pixel transparent mouse target without background polling.
- The drawer handle no longer draws a rectangular background outside the rounded panel.

## [1.0.12] - 2026-08-13

### Added

- The templates drawer now offers the same right-click Edit and Delete actions as favorites in the main window.

### Changed

- New installations and reset settings now use Grid as the default history view.

### Fixed

- When the drawer edge is hidden, an invisible on-screen strip and a wider top-edge hot zone make the drawer easier to open with the mouse.

## [1.0.11] - 2026-08-13

### Added

- Added a setting to enable or disable the templates drawer. The drawer-edge setting appears only while the drawer is on.

### Changed

- New installations now start with Windows by default. Closing still minimizes to the tray, and the window opens visible unless Start minimized is turned on.
- The templates drawer uses tighter side padding, and non-icon favorites stretch to the drawer width.

### Fixed

- Copied items now appear in history immediately instead of waiting for disk persistence.
- Hiding the templates drawer edge no longer disables the drawer: moving the pointer to the top of the screen still opens it.
- Favorite chips on the main window can be reordered by dragging again.

## [1.0.10] - 2026-08-13

### Changed

- The top-edge drawer now uses a gentler, slightly longer opening motion while remaining responsive.
- The drawer checks the invisible top-edge hot zone only when its visible edge is disabled, eliminating that background work in the default configuration.

### Fixed

- Restored automatic clipboard history capture with platform-native change monitoring and persistence, without periodically polling history from the interface.

## [1.0.9] - 2026-08-13

### Added

- Clipboard history now captures file and folder references without copying their contents into CopyBoard storage.

### Changed

- The top-edge drawer now opens and closes more smoothly and reserves enough width around its content to avoid a horizontal scrollbar.

### Fixed

- Clipboard monitoring now starts only after the renderer listener is ready and reliably detects the same value again after another clipboard format.

## [1.0.8] - 2026-08-13

### Changed

- Renamed the Language settings section to Interface.
- The top-edge drawer now keeps a blue pull indicator and shows a one-item-sized localized placeholder when favorites are empty.

### Fixed

- Fixed the drawer not opening with an empty favorites list and restored immediate favorite updates without restarting the app.
- Removed the square window background around the drawer's rounded corners.

## [1.0.7] - 2026-08-13

### Added

- Added a language-adjacent setting to show or fully hide the top-edge drawer tab, enabled by default.

### Changed

- The top-edge favorites drawer is now a compact centered panel with no visible closed edge, matching favorite chip sizing and stacking non-icon-only items one per row.

### Fixed

- The top-edge drawer now refreshes favorites immediately after additions or removals and again before every opening.
- The Windows app icon no longer shows white background corners on the desktop or taskbar.

## [1.0.6] - 2026-08-13

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
