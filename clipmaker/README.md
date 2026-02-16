# Clipmaker

A standalone browser-based video clipmaker for live streams and fmp4 files. All processing is client-side using ffmpeg.wasm. No server-side dependencies.

## Features
- Play a live stream (default: mystream)
- Mouse-based scrubbing and seeking
- Mark in/out points for clips
- Export clips as fmp4 files
- Popup/standalone UI

## Getting Started
1. Open index.html in your browser.
2. Use the UI to load the live stream or select a local fmp4 file.
3. Scrub, mark in/out, and export clips as needed.

## Tech Stack
- HTML5/JavaScript
- ffmpeg.wasm
- No backend required

## Notes
- All video processing is done in the browser for privacy and security.
- Replace the stream URL or file input logic as needed for your environment.
