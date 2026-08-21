# GATE

GATE is a single-file, self-contained web app for logging movie frames (screenshots/stills) into a searchable, filterable gallery — "a running log of frames worth freezing."

Everything lives in [gate_3.html](gate_3.html): markup, styles, and logic in one file, with no build step and no server required. Just open it in a browser.

## Features

- **Log frames** by pasting image URLs or uploading files from your device (uploads are auto-resized and compressed before saving).
- **Group by movie** — frames are organized into per-movie collections with director, year, genre, and actor metadata.
- **Search, sort, and filter** the gallery by title, director, genre, or notes.
- **Lightbox and movie view** for browsing a movie's frames, including a generated color palette per image.
- **Export / import** the whole collection as JSON.
- **Owner mode** — a client-side passcode gate (hashed with SHA-256) that must be unlocked before frames can be added or removed. This is a casual deterrent, not real security: there's no server to check the password against, so anyone with dev tools can bypass it.

## Storage

GATE adapts to whatever storage is available:

1. **`window.storage`** (Claude's shared storage), if present — makes the gallery a shared, public collection visible to anyone with the link.
2. **`localStorage`**, as a fallback — keeps the collection private to that browser.
3. **In-memory only**, if neither is available (e.g. private/incognito mode) — frames are lost on refresh.

The active mode is shown in the badge under the page header.

## Usage

Open [gate_3.html](gate_3.html) directly in a browser — no installation or dependencies needed.
