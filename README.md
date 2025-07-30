# PageSnap

A high-fidelity webpage-to-image conversion tool.

This repository contains the source code for the PageSnap library, web service, and Python client.

## Overview

PageSnap is a versatile library and web service for converting webpages into high-quality images. It is designed to handle modern, dynamic web content with precision and includes a key feature for intelligently removing visual obstructions like popups and ads before capture.

See the [design document](docs/DESIGN.md) for more details.

## Features

-   **High-Fidelity Conversion**: Converts webpages to PNG and JPG formats with high fidelity.
-   **Obstruction Removal**: Intelligently removes popups, ads, and other visual obstructions before capture.
-   **Configurable Watermarking**: Add text or image watermarks to your snapshots.
-   **Flexible API**: Use the core library directly, or interact with the web service API.
-   **Python Client**: A convenient Python client for interacting with the PageSnap API.

## Project Structure


This is a monorepo using npm workspaces.

-   `packages/core`: The core NodeJS library for conversion.
-   `packages/api`: The Express.js web service.
-   `python`: The Python client library.
-   `docs`: Design and implementation documents.

## Getting Started

1.  Install dependencies and Playwright browsers:
    ```bash
    npm run setup
    ```

See the README in each package for more specific instructions.

## Configuration

PageSnap can be configured using a `pagesnap.config.json` file in the root of the project. The following options are available:

```json
{
  "output": {
    "location": "./snapshots",
    "formats": ["png", "jpg"],
    "storage": {
      "provider": "filesystem",
      "location": "./snapshots",
      "overwrite": true
    }
  },
  "performance": {
    "maxConcurrency": 4
  },
  "sanitization": {
    "blockerLists": [],
    "customRules": [
      "#cookie-law-info-bar",
      "[id*='cookie']",
      "[class*='cookie']",
      "[id*='banner']",
      "[class*='banner']",
      "[id*='popup']",
      "[class*='popup']",
      "[id*='dialog']",
      "[class*='dialog']"
    ]
  },
  "watermark": {
    "enabled": false,
    "type": "text",
    "text": {
      "content": "PageSnap",
      "font": "Arial",
      "size": "24px",
      "color": "rgba(0, 0, 0, 0.5)",
      "position": "bottom-right",
      "x_offset": 10,
      "y_offset": 10
    },
    "image": {
      "path": "",
      "opacity": 0.5,
      "position": "center",
      "width": "100px",
      "height": "auto"
    }
  }
}
```
