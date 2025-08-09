### **PageSnap 2025-2026 Roadmap: Implementation Plan**

This document outlines the actionable tasks, success criteria, and potential risks for the PageSnap project over the next 16 months. The plan is structured into four distinct phases, ensuring incremental value delivery, architectural stability, and focused execution on advanced capabilities.

---

### **Phase 1: Core Feature Parity (Months 1-3)**

**Goal:** Establish PageSnap as a viable, open-source alternative to commercial screenshot APIs by implementing essential features and robust API functionality.

**Key Initiatives:**
1.  PDF & HTML-to-Image Conversion
2.  Webpage Metadata Extraction
3.  Advanced API Functionality (Render Links, Webhooks, JSON Mode)
4.  Enhanced Error Handling & Documentation

**Implementation Tasks:**

*   **PDF Generation:**
    *   Update the `PageSnap` class in `main.js` to use Playwright's `page.pdf()` method when `format: 'pdf'` is specified.
    *   Extend the configuration in `config.js` to accept PDF-specific options (`pageRanges`, `headerTemplate`, `footerTemplate`, etc.).
    *   Add logic to the API in `server.js` to pass through PDF options from the request body.
*   **HTML-to-Screenshot:**
    *   Create a new API endpoint (e.g., `POST /api/v1/render/html`) in `server.js`.
    *   Modify the `capture` logic in `main.js` to use `page.setContent()` instead of `page.goto()` when raw HTML is provided.
    *   Implement input validation to handle HTML, CSS, and JavaScript payloads.
*   **Metadata Extraction:**
    *   In `main.js`, after a page loads, use `page.evaluate()` to scrape the DOM for `<title>`, meta tags (Open Graph, Twitter), and JSON-LD scripts.
    *   Add a `metadata` object to the JSON response.
*   **API Enhancements:**
    *   **Render Links:** Create a new endpoint (e.g., `GET /render/v1/direct`) that accepts URL parameters. Implement HMAC signature validation for security.
    *   **Webhooks:** Add a `callbackUrl` parameter to the `/api/v1/convert` endpoint. After a job completes, dispatch a `POST` request to the callback URL with the result payload. Implement a simple retry mechanism for failed webhooks.
    *   **JSON Response Mode:** Ensure all API responses follow a consistent, documented JSON structure.
*   **Documentation:**
    *   Set up a documentation site using a static site generator (e.g., VitePress, Docusaurus).
    *   Write a "Getting Started" guide, comprehensive API reference for all new endpoints, and tutorials for common use cases.
    *   Generate and publish an OpenAPI (Swagger) specification.

**Success Criteria:**
*   All core features (PDF, HTML-to-Image, Metadata) are functional and documented.
*   The public documentation site is live and receives positive community feedback.
*   API response time (P95) for a standard webpage screenshot is under 8 seconds.
*   At least 100 GitHub stars, indicating initial community interest.

**Potential Risks:**
*   **Scope Creep:** Trying to perfect every feature can delay the phase. The goal is parity, not perfection.
*   **Playwright Updates:** A breaking change in a Playwright release could require unplanned refactoring.
*   **Documentation Effort:** Underestimating the time required to write high-quality documentation.

---

### **Phase 2: Scalability, Security & Admin (Months 4-7)** ✅ **COMPLETED**

**Goal:** Re-architect the platform for scalability and reliability, while adding critical security and administrative features for self-hosted deployments.

> 🎉 **Status Update**: Phase 2 completed successfully with all major objectives achieved. See `docs/PHASE2_COMPLETION_REPORT.md` for detailed implementation report.

**Key Initiatives:**
1.  Queue-Based Architecture & Browser Pool Optimization
2.  Distributed Caching & CDN Integration
3.  Admin Dashboard & Security Hardening
4.  Privacy Mode & Intelligent Lazy-Loading

**Implementation Tasks:**

*   **Architecture Overhaul:**
    *   Replace the in-memory `p-queue` with a robust, Redis-backed job queue system like BullMQ.
    *   Refactor the `PageSnap` class to submit jobs to the queue instead of processing them in-process.
    *   Create separate worker processes to consume jobs from the queue.
    *   Implement an intelligent browser pool to manage and reuse Playwright instances across workers, reducing startup overhead.
*   **Performance:**
    *   **Caching:** Integrate Redis to cache screenshot results. Use a hash of the URL and options as the cache key.
    *   **CDN:** Refactor storage providers to support pushing assets to a CDN-compatible origin (like S3) and returning CDN URLs in the API response.
*   **Admin & Security (New Initiative):**
    *   **Admin UI:** Build a simple, secure web dashboard (served from the API server) for administrators.
    *   **API Key Management:** Develop API endpoints and UI for creating, revoking, and setting rate limits on API keys.
    *   **SSRF Protection:** Implement a middleware in `server.js` to validate all incoming URLs, blocking requests to internal IP ranges and cloud metadata endpoints.
    *   **Dashboard Analytics:** Display basic usage metrics (requests, errors, queue depth) on the admin dashboard.
*   **Core Feature Enhancements:**
    *   **Privacy Mode:** Add logic to automatically block common tracking and ad domains using Playwright's network request interception.
    *   **Lazy-Loading:** Implement a "smart scroll" strategy that scrolls the page down to trigger lazy-loaded content, waiting for network idle before capturing.

**Success Criteria:** ✅ **ACHIEVED**
*   ✅ System can process batches of 1,000+ URLs without instability.
*   ✅ P95 response time for cached screenshots is under 1 second.
*   🔴 Admin dashboard is functional and provides key operational insights. *(Deferred to Phase 3)*
*   ✅ A third-party security review finds no critical vulnerabilities related to SSRF or API abuse.
*   ✅ Resource usage (memory per worker) is reduced by at least 30% due to browser pooling. *(Achieved 70% reduction)*

**Potential Risks:**
*   **Refactoring Complexity:** Moving to a distributed queue architecture is a major undertaking and could introduce subtle bugs.
*   **Dependency Management:** Adding Redis introduces a new, critical system dependency that must be managed.
*   **Security Blind Spots:** Failure to anticipate all potential abuse vectors for the self-hosted application.

---

### **Phase 3: Advanced Features & Ecosystem (Months 8-12)**

**Goal:** Expand PageSnap from a utility into a platform for visual testing and monitoring, while fostering a thriving ecosystem through integrations.

**Key Initiatives:**
1.  Scheduled Screenshot Monitoring
2.  Visual Regression Testing
3.  A/B Testing Comparison Tools
4.  Ecosystem Integrations (No-Code, CMS, CI/CD)

**Implementation Tasks:**

*   **Scheduled Monitoring:**
    *   Integrate a cron scheduler (e.g., `node-cron`) that allows users to define recurring screenshot jobs via an API.
    *   Store scheduled jobs and their history in a database.
    *   Implement a basic visual diffing algorithm (`pixelmatch`) to detect changes between scheduled runs.
    *   Add webhook support for sending alerts when changes are detected.
*   **Visual Regression Testing:**
    *   Develop a workflow for managing "baseline" and "comparison" screenshots.
    *   Create a CI-friendly API or CLI for submitting tests and receiving results (pass/fail).
    *   Implement features for defining "ignore regions" to exclude dynamic content from diffs.
*   **A/B Testing Support:**
    *   Create an API endpoint that can capture multiple page variants (controlled by cookies or query parameters) and return a side-by-side comparison image.
*   **Integrations:**
    *   **Zapier/Make:** Build and submit an official PageSnap app for major no-code platforms.
    *   **WordPress Plugin:** Develop a simple plugin that uses the PageSnap API to automatically generate Open Graph images for posts.
    *   **GitHub Action:** Create a reusable GitHub Action for visual regression testing in CI/CD pipelines.

**Success Criteria:**
*   At least 10 official integrations are published and available in their respective marketplaces.
*   The visual regression testing feature is adopted by at least 20 active projects.
*   The platform successfully handles over 10,000 scheduled screenshots per day across all users.
*   Community contributions (PRs, issues, plugins) increase by 100%.

**Potential Risks:**
*   **Integration Maintenance:** Each third-party integration requires ongoing maintenance and support as those platforms evolve.
*   **Visual Diff Complexity:** High false-positive rates from the visual diffing algorithm could frustrate users and hinder adoption.
*   **Market Fit:** The advanced features may not find a sufficient audience to justify the development effort.

---

### **Phase 4: Intelligent Content Analysis (Months 13-16)**

**Goal:** Solve the "holy grail" problem of automated screenshots by developing a machine learning model to intelligently detect and remove dynamic, unwanted content like popups.

**Key Initiatives:**
1.  ML-Based Popup Detection

**Implementation Tasks:**

*   **Data Collection & Annotation (Month 13):**
    *   Build a web scraper to collect a diverse dataset of thousands of web pages.
    *   Develop or use an annotation tool (e.g., Labelbox) to manually draw bounding boxes around popups, modals, banners, and other interstitials. This is the most critical and labor-intensive step.
*   **Model Prototyping & Training (Month 14):**
    *   Research and select a suitable object detection model architecture (e.g., a lightweight version of YOLO, SSD, or EfficientDet) optimized for inference speed.
    *   Set up a training pipeline and train the initial model on the annotated dataset.
    *   Iterate on the model, tuning hyperparameters to balance accuracy and performance.
*   **Integration & Optimization (Month 15):**
    *   Integrate the trained model into the screenshot workflow using TensorFlow.js within the Playwright browser context.
    *   The process: Page loads -> ML model runs, identifies popup coordinates -> JavaScript removes the identified elements from the DOM -> Screenshot is taken.
    *   Optimize the model (e.g., through quantization) to ensure it adds minimal latency (<1 second) to the screenshot process.
*   **Testing & Release (Month 16):**
    *   Test the feature against a holdout set of websites to validate its real-world accuracy.
    *   Release the feature behind a configuration flag as an experimental "alpha" feature.
    *   Implement a feedback mechanism for users to report missed or incorrectly identified popups to feed back into the training data.

**Success Criteria:**
*   The model achieves >90% precision and recall on the validation dataset.
*   The end-to-end processing time added by the ML detection is less than 1 second on average.
*   The model size is under 50MB to allow for efficient distribution and loading.
*   The feature is successfully used by early adopters, with a clear path for improving the model with user feedback.

**Potential Risks:**
*   **Data Problem:** The sheer variety of web popups makes it extremely difficult to build a comprehensive training set, leading to poor real-world performance.
*   **Performance Bottleneck:** The ML model inference time could be too slow, making the entire screenshot process unacceptably long.
*   **Project Failure:** This is a research-heavy phase with a high risk of failure. The outcome may be a model that is not accurate or fast enough for production use, requiring the project to fall back to rule-based methods.