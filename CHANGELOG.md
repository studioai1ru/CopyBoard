# Changelog

All notable user-visible changes to CopyBoard are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- Масштабирование карточек с помощью Ctrl и колеса теперь сразу учитывает фактическое число колонок после изменения размера окна.
- Действие выпуска в Codex теперь работает с Node.js 24 в Windows, проверяет проект, сохраняет текущие изменения в Git, создаёт патч-версию и отправляет её на GitHub.

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
