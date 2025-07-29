# PageSnap: Phased Implementation Plan

This document outlines a phased approach to building the PageSnap tool, allowing for iterative development, testing, and feedback.

---

### Phase 1: Core Library & MVP

**Goal:** Create a functional NodeJS library that can convert a list of URLs to images and save them to the filesystem. This phase focuses on establishing the core logic and project structure.

**Key Tasks:**

1.  **Project Setup:**
    *   Initialize the monorepo with npm workspaces.
    *   Set up the `@pagesnap/core` package with necessary dependencies (Playwright, p-queue).
    *   Create a basic test suite setup using a framework like Jest.

2.  **Configuration:**
    *   Implement logic to read and parse `pagesnap.config.json`.
    *   Support basic configuration for output formats and file paths.

3.  **Conversion Logic:**
    *   Implement the main `capture()` function that takes an array of URLs.
    *   Use Playwright to navigate to pages and take full-page screenshots.
    *   Implement parallel processing using `p-queue` controlled by `maxConcurrency`.

4.  **Content Sanitization (MVP):**
    *   Implement the selector-based blocking mechanism.
    *   Allow custom CSS selectors from the config file to be used for removing elements.

5.  **Storage Provider (FileSystem):**
    *   Implement the initial `FileSystem` storage provider.
    *   Support saving files to a specified directory and the `overwrite` option.

6.  **CLI:**
    *   Create a simple CLI interface (e.g., using `yargs`) in the `@pagesnap/core` package to run conversions from the command line.

**Exit Criteria:** A developer can use the NodeJS library or its CLI to convert a list of URLs into PNG/JPG/SVG images, with basic ad-blocking, and have them saved to a local directory.

---

### Phase 2: Advanced Storage & Web Service API

**Goal:** Expand storage options and expose the core functionality through a web service.

**Key Tasks:**

1.  **Storage Provider Interface:**
    *   Refactor the storage logic to use a common `StorageProvider` interface.

2.  **New Storage Providers:**
    *   Implement the `S3` storage provider (requires `aws-sdk`).
    *   Implement the `InMemory` storage provider with an LRU cache for resource management.

3.  **Output Cleanup:**
    *   Implement the `ttl` (time-to-live) feature for the `FileSystem` and `S3` providers.
    *   Add a `cleanup()` method to the providers that can be called to purge expired files.

4.  **Web Service (`@pagesnap/api`):**
    *   Create the Express.js (or Fastify) application in the `@pagesnap/api` package.
    *   Implement the `POST /api/v1/convert` endpoint.
    *   The API should return image data directly when using the `InMemory` provider or return status/links for other providers.

5.  **Documentation:**
    *   Add API documentation using a tool like Swagger or by creating an OpenAPI specification.

**Exit Criteria:** The core library supports S3 and in-memory storage. A web service is available to perform conversions via an HTTP API.

---

### Phase 3: Python Client & Refinements

**Goal:** Achieve feature parity with a native Python client and refine the system for broader use.

**Key Tasks:**

1.  **Python Client Library (`pagesnap`):**
    *   Set up the `python/` directory as a Python package.
    *   Use `playwright-python` to implement the core conversion logic, mirroring the NodeJS library.
    *   Ensure the Python client can read and use the same `pagesnap.config.json` file.
    *   Implement the same set of storage providers (FileSystem, S3, InMemory).

2.  **Content Sanitization (Advanced):**
    *   Integrate a parser for public ad-blocker lists (e.g., EasyList).
    *   Add more advanced heuristic-based detection for popups and banners.

3.  **Comprehensive Documentation:**
    *   Write detailed usage guides for the NodeJS library, the Python client, and the Web API.
    *   Document the configuration file options thoroughly.

4.  **Publishing Preparation:**
    *   Prepare the `@pagesnap/core` and `@pagesnap/api` packages for publishing to the npm registry.
    *   (Future) Prepare the `pagesnap` Python package for publishing to PyPI once it has been proven in local projects.

**Exit Criteria:** A Python developer can use the `pagesnap` library to perform conversions with the same features as the NodeJS version. The entire system is well-documented and ready for wider adoption.
