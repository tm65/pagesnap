# PageSnap

A high-fidelity webpage-to-image conversion tool.

This repository contains the source code for the PageSnap library, web service, and Python client.

## Overview

PageSnap is a versatile library and web service for converting webpages into high-quality images. It is designed to handle modern, dynamic web content with precision and includes a key feature for intelligently removing visual obstructions like popups and ads before capture.

See the [design document](docs/DESIGN.md) for more details.

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
