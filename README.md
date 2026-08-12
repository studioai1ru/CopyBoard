# CopyBoard

CopyBoard is a local clipboard history and favorites app for Windows. It runs as an Electron desktop application and keeps copied text, code, and images available for reuse.

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
- electron-builder for Windows packaging

## Requirements

Development and packaging require Windows, Node.js, and npm. The application package produced by the documented command targets Windows.

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

Packaged artifacts are written to `release/`.

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
```
