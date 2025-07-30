# Known Issues

## Core Package Testing

The test suite for the `@pagesnap/core` package is currently not running due to a complex issue involving ES Modules, Jest, and dynamic imports. The tests fail with a `SyntaxError: Cannot use import statement outside a module` error.

Several attempts were made to resolve this issue, including:
-   Configuring Jest to use `babel-jest`
-   Using `moduleNameMapper` and `modulePaths` in the Jest configuration
-   Switching to the `jsdom` test environment

None of these solutions were successful. The issue seems to be deeply rooted in the way Jest handles ES Modules and dynamic imports.

The watermarking feature was tested manually and through the Python client, which uses the same logic. We are confident that the feature is working as expected, but the lack of automated tests for the core package is a known issue that should be addressed in the future.
