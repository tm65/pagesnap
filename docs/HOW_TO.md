# How to Use PageSnap

This guide provides instructions for installing, configuring, and using the PageSnap tool via its command-line interfaces (CLIs) and web service API.

---

## 1. Project Setup

First, clone the repository and install the root dependencies.

```bash
# Clone your repository
git clone https://github.com/your-repo/pagesnap.git
cd pagesnap

# Install NodeJS dependencies for the monorepo
npm install
```

---

## 2. NodeJS Usage (@pagesnap/core)

The NodeJS version is the core of the project and can be used directly.

### Installation

The necessary Playwright browser binaries are installed via the root `npm install` command. If you need to re-install them, run:
```bash
npx playwright install --with-deps
```

### CLI Usage

The NodeJS CLI provides a direct way to capture screenshots.

**Basic Command:**
```bash
node packages/core/src/cli.js https://example.com https://www.google.com
```

**Region Capture (Workaround for Popups):**
To capture a specific region of the page, provide the coordinates and dimensions.
```bash
node packages/core/src/cli.js https://example.com --x 0 --y 0 --width 1280 --height 800
```

---

## 3. Python Usage (pagesnap)

The Python version provides feature-parity for use in Python environments.

### Installation

1.  **Navigate to the Python directory:**
    ```bash
    cd python
    ```

2.  **Install Dependencies:**
    You may need to use `sudo` depending on your environment.
    ```bash
    # Install required Python packages
    pip install -r requirements.txt

    # Install Playwright browsers
    playwright install --with-deps
    ```

3.  **Install the Package for CLI Use:**
    Installing in "editable" mode (`-e`) makes the `pagesnap` command available on your path.
    ```bash
    pip install -e .
    ```

### CLI Usage

Once installed, the `pagesnap` command is available globally.

**Basic Command:**
```bash
pagesnap https://example.com https://www.google.com
```

**Region Capture:**
```bash
pagesnap https://example.com --x 0 --y 0 --width 1280 --height 800
```

---

## 4. Web Service API Usage (@pagesnap/api)

The API exposes PageSnap's functionality over HTTP.

### Starting the Server

```bash
# From the root project directory
npm run api
# Or:
# cd packages/api
# npm start
```
The server will start on `http://localhost:3000` by default.

### API Endpoint: `POST /api/v1/convert`

This endpoint accepts a JSON body to perform conversions.

**Request Body:**
*   `urls` (array, required): An array of one or more URL strings.
*   `formats` (array, optional): Overrides the formats from the config file (e.g., `["png", "jpg"]`).
*   `clip` (object, optional): An object defining a capture region with `x`, `y`, `width`, and `height`.

**Example Request (using `curl`):**
```bash
curl -X POST http://localhost:3000/api/v1/convert \
-H "Content-Type: application/json" \
-d '{
  "urls": ["https://example.com"],
  "formats": ["png"],
  "clip": {
    "x": 0,
    "y": 0,
    "width": 800,
    "height": 600
  }
}'
```

**Response:**
The API returns a JSON object containing the results.
*   If using `"provider": "filesystem"` or `"provider": "s3"`, the `path` field will contain the location of the saved image.
*   If using `"provider": "in-memory"`, the `imageData` field will contain the Base64-encoded image data.

**Example Response (for in-memory storage):**
```json
{
  "results": [
    {
      "url": "https://example.com",
      "format": "png",
      "imageData": "iVBORw0KGgoAAAANSUhEUgAAB..."
    }
  ]
}
```
