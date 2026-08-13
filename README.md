# CopyBoard

CopyBoard is a local clipboard history and favorites app for Windows and macOS. It runs as a lightweight Tauri desktop application and keeps copied text, code, and images available for reuse.

## Download

| Windows 10/11 | macOS |
| --- | --- |
| [Download the x64 installer](https://github.com/studioai1ru/CopyBoard/releases/latest/download/CopyBoard-Windows-x64-Setup.exe) | [Download the universal DMG](https://github.com/studioai1ru/CopyBoard/releases/latest/download/CopyBoard-macOS-universal.dmg) |

The macOS installer supports both Apple Silicon and Intel Macs. Installers are currently unsigned, so Windows SmartScreen or macOS Gatekeeper may show a warning.

[Release notes](https://github.com/studioai1ru/CopyBoard/releases/latest) · [Changelog](CHANGELOG.md) · [All releases](https://github.com/studioai1ru/CopyBoard/releases)

## What it does

- Watches the system clipboard for text and images.
- Classifies text and code entries and stores a searchable history.
- Filters history by content type and switches between list and grid layouts.
- Lets you copy, edit, delete, preview, and favorite saved entries.
- Keeps reusable favorites in a quick-copy panel.
- Supports dark and light appearance modes plus Russian and English UI.
- Integrates with the system tray, start-on-login, start-minimized, and close-to-tray behavior.
- Registers global shortcuts for opening the app and clearing history.
- Applies configurable history limits and retention periods.

CopyBoard stores its data on the local machine. The repository does not include a cloud service or account system.

## Technology

- Tauri and Rust for clipboard access, tray integration, global shortcuts, and native windows
- React and Vite for the renderer
- SCSS for component styling
- Tauri Bundler for Windows and macOS packaging

## Requirements

Development requires Node.js 22.12 or newer, npm, Rust, and the [Tauri system prerequisites](https://v2.tauri.app/start/prerequisites/). Native installers should be packaged on their target operating system: Windows for the NSIS installer and macOS for the DMG image.

## Install dependencies

```bash
npm install
```

## Run in development

```bash
npm run dev
```

This starts Vite and opens the application in its Tauri window.

To run only the renderer in a browser:

```bash
npm run dev:react
```

## Build

Build the renderer:

```bash
npm run build
```

Create a Windows installer:

```bash
npm run dist:win
```

Create a universal macOS installer for Apple Silicon and Intel Macs:

```bash
npm run dist:mac
```

The macOS command must be run on macOS. Packaged artifacts are written to `release/`. The Windows installer uses the WebView2 runtime already included with current Windows versions instead of bundling a separate copy of Chromium.

## GitHub releases

The `Build and publish installers` workflow builds both installers on GitHub-hosted Windows and macOS runners.

- Run the workflow manually to test both builds. Installers are stored as workflow artifacts for 14 days.
- Push a version tag matching `package.json`, such as `v1.0.0`, to create a GitHub Release automatically.
- Every release includes the Windows EXE, the universal macOS DMG, and `SHA256SUMS.txt`.
- User-visible changes are collected in [`CHANGELOG.md`](CHANGELOG.md) and copied to the corresponding GitHub Release page automatically.

Example release:

```bash
npm run release:patch
```

In the Codex app, the same workflow is available as the `Publish New Version` project environment action. It runs lint and build checks, commits current changes when needed, then moves the `Unreleased` changelog entries into the new version, creates the version commit and tag, and pushes everything to GitHub.

Installers are unsigned unless signing credentials are configured in the GitHub repository. For macOS distribution without Gatekeeper warnings, add `MAC_CSC_LINK`, `MAC_CSC_KEY_PASSWORD`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, and `APPLE_TEAM_ID`. Windows signing requires a certificate configured for Tauri Bundler.

## Local data

Tauri stores CopyBoard data in the operating system's application-data directory. On a standard Windows installation, the files are located under `%APPDATA%/com.copyboard.desktop/`:

- `settings.json` — application preferences
- `clipboard-history.json` — history metadata
- `clipboard-images/` — persisted image payloads
- `frequent-items.json` — favorites

These runtime files are not part of the repository.

On first launch after upgrading from the Electron version, CopyBoard copies existing settings, history, saved images, and favorites from `%APPDATA%/CopyBoard/`. The original data is left intact as a recovery copy.

## Useful commands

```bash
npm run lint
npm run build
npm run dist:win
npm run dist:mac
```
