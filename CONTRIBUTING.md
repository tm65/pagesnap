# Contributing to PageSnap

First off, thank you for considering contributing to PageSnap! Your help is essential for keeping it a great open-source tool.

This document provides guidelines for contributing to the project. Please read it carefully to ensure a smooth and effective development process for everyone.

## Core Architecture and Technology

To maintain consistency and quality, please adhere to the following architectural principles:

*   **Module System:** The entire project uses **ES Modules (ESM)**. All new JavaScript code should use `import` and `export` syntax. Configuration files must also respect this; use `.cjs` for any CommonJS configuration files (like `babel.config.cjs`).
*   **Testing Framework:** We use **Jest** for all automated testing. All new features or bug fixes must be accompanied by corresponding tests.
*   **Primary Language:** All backend and core logic is written in **Node.js**.

## Setting Up Your Development Environment

1.  **Fork and Clone:** Fork the repository to your own GitHub account and then clone it to your local machine.
2.  **Install Node.js:** Ensure you have a recent LTS version of Node.js installed (e.g., v18.x or later).
3.  **Install Dependencies:** The project is a monorepo managed by npm workspaces. Install all dependencies from the root directory:
    ```bash
    npm install
    ```
4.  **Install Playwright Browsers:** The core package requires Playwright's browser binaries. Install them with:
    ```bash
    npx playwright install --with-deps
    ```

## Running Tests

To ensure your changes are working correctly and have not introduced any regressions, run the test suite for the core package:

```bash
# Run from the project root directory
npm test -w @pagesnap/core
```

All tests must pass before a pull request will be considered for merging.

## Code Style and Conventions

*   **Mimic Existing Style:** The most important rule is to write code that is consistent with the existing codebase. Look at surrounding files to understand the established patterns for formatting, naming, and structure.
*   **Configuration:** Avoid hard-coding values. Use constants or values from the central `config.js` file.
*   **Comments:** Write comments to explain the *why*, not the *what*. Add comments only when the code's purpose is not immediately obvious.

## Submitting a Pull Request

1.  Create a new branch for your feature or bug fix.
2.  Make your changes, ensuring you follow the code style and add any necessary tests.
3.  Ensure all tests pass.
4.  Push your branch to your fork and submit a pull request to the main PageSnap repository.
5.  In your pull request description, clearly explain the changes you have made and why.

Thank you again for your contribution!
