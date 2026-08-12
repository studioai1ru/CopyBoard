# CopyBoard

CopyBoard is a local clipboard history and favorites app for Windows and macOS. It runs as an Electron desktop application and keeps copied text, code, and images available for reuse.

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

- Electron for the desktop process, clipboard access, tray, and global shortcuts
- React and Vite for the renderer
- SCSS for component styling
- electron-builder for Windows and macOS packaging

## Requirements

Development requires Node.js and npm. Native installers should be packaged on their target operating system: Windows for the NSIS installer and macOS for the DMG image.

## Install dependencies

```bash
npm install
```

## Run in development

```bash
npm run dev
```

This starts Vite and then opens the Electron application.

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

The macOS command must be run on macOS. Packaged artifacts are written to `release/`.

## GitHub releases

The `Build and publish installers` workflow builds both installers on GitHub-hosted Windows and macOS runners.

- Run the workflow manually to test both builds. Installers are stored as workflow artifacts for 14 days.
- Push a version tag matching `package.json`, such as `v1.0.0`, to create a GitHub Release automatically.
- Every release includes the Windows EXE, the universal macOS DMG, and `SHA256SUMS.txt`.

Example release:

```bash
npm version patch
git push origin main --follow-tags
```

Installers are unsigned unless signing secrets are configured in the GitHub repository. For macOS distribution without Gatekeeper warnings, add `MAC_CSC_LINK`, `MAC_CSC_KEY_PASSWORD`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, and `APPLE_TEAM_ID`. Windows signing can use `WIN_CSC_LINK` and `WIN_CSC_KEY_PASSWORD`.

## Local data

Electron stores CopyBoard data under its `userData` directory. On a standard Windows installation, the files are located under `%APPDATA%/CopyBoard/`:

- `settings.json` — application preferences
- `clipboard-history.json` — history metadata
- `clipboard-images/` — persisted image payloads
- `frequent-items.json` — favorites

These runtime files are not part of the repository.

## Useful commands

```bash
npm run lint
npm run build
npm run dist:win
npm run dist:mac
```
