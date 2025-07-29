# PageSnap (Python Client)

This directory contains the Python client for the PageSnap tool.

## Overview

This is the Python implementation of the PageSnap library. It provides feature-parity with the NodeJS core library, allowing for high-fidelity webpage-to-image conversion directly within a Python environment.

For full project details, see the main [README.md](../README.md) in the root directory.

## Installation

To install the package and its dependencies, run the following from this directory:

```bash
# Install dependencies
pip install -r requirements.txt

# Install playwright browsers
playwright install --with-deps

# Install the package in editable mode for development
pip install -e .
```

## Usage

Once installed, you can use the `pagesnap` command-line tool:

```bash
pagesnap https://example.com
```
