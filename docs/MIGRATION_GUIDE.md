# PageSnap 2025 Migration Guide: Upgrading to the Queue-Based Architecture

Welcome to the next generation of PageSnap! The 2025 update introduces a more scalable, reliable, and feature-rich platform powered by Redis and BullMQ. The most significant change is a move from a synchronous "request-and-wait" model to a modern, queue-based architecture.

This guide will walk you through the necessary changes to update your integration.

**Current Status:** Phase 2 Complete ✅
**Required Action:** High (Breaking Changes)

> 🎉 **Updated:** Phase 2 implementation is now complete with browser pooling, Redis caching, SSRF protection, and worker separation.

---

### Why Are We Making This Change?

The original synchronous API was simple, but it had limitations. Long-running screenshot jobs could lead to timeouts, and the system struggled to scale under heavy load. Our new Redis-backed job queue architecture provides:

*   **Enhanced Reliability:** Your requests are safely queued and processed, even during peak traffic.
*   **Immediate Response:** Your application will receive an immediate confirmation that the job has been accepted, preventing your own services from being blocked by long-running requests.
*   **Greater Scalability:** The new architecture can scale to handle millions of screenshots.
*   **New Features:** This change unlocks powerful new capabilities like webhooks and detailed job status tracking.

---

### Key Change: Asynchronous Processing

Previously, when you made a `POST` request to `/api/v1/convert`, the connection would remain open until the screenshot was complete, and the API would return the final image URL or data.

**This workflow has changed.**

The API now immediately returns a `jobId` and a `statusUrl`. You will then be notified of job completion via a **webhook**, or you can periodically poll the `statusUrl` for the result.

#### **Old Synchronous Workflow (Before Migration)**

1.  `POST /api/v1/convert` with a URL.
2.  Connection hangs open for 5-30 seconds.
3.  API returns `200 OK` with the final screenshot data.

```json
// OLD RESPONSE
{
  "success": true,
  "url": "https://example.com",
  "path": "https://cdn.pagesnap.io/screenshots/example_com_12345.png"
}
```

#### **New Asynchronous Workflow (After Migration)**

1.  `POST /api/v1/convert` with a URL and a new `callbackUrl`.
2.  API immediately returns `202 Accepted` with a `jobId`.
3.  When the screenshot is complete, PageSnap sends a `POST` request to your `callbackUrl` with the final result.

**Step 1: Initial API Request**

Your request body must now include a `callbackUrl`.

```diff
// POST /api/v1/convert
{
  "url": "https://example.com",
  "format": "png",
+ "callbackUrl": "https://api.yourapp.com/webhook/pagesnap-complete"
}
```

**Step 2: Immediate API Response**

You will receive this response in under a second.

```json
// NEW RESPONSE
{
  "status": "accepted",
  "jobId": "a8b4c1d9-e6f2-4a1b-9c3d-e8f2a1b9c3d0",
  "statusUrl": "https://api.pagesnap.io/api/v1/jobs/a8b4c1d9-e6f2-4a1b-9c3d-e8f2a1b9c3d0"
}
```

**Step 3: The Webhook (Job Completion)**

Once the job is done, PageSnap will `POST` the final result to your `callbackUrl`. Your endpoint should be prepared to receive this data.

```json
// POST https://api.yourapp.com/webhook/pagesnap-complete
{
  "jobId": "a8b4c1d9-e6f2-4a1b-9c3d-e8f2a1b9c3d0",
  "status": "completed",
  "result": {
    "success": true,
    "url": "https://example.com",
    "path": "https://cdn.pagesnap.io/screenshots/example_com_56789.png",
    "metadata": {
      "title": "Example Domain",
      // ... etc
    }
  }
}
```

---

### New and Updated Features

This update also includes all features from Phase 1 and 2 of our roadmap.

*   **PDF Generation:** ✅ Specify `format: 'pdf'` and include PDF-specific options in your request.
*   **HTML-to-Image:** ✅ Raw HTML can be passed directly to the capture method (detected automatically).
*   **Render Links:** ✅ HMAC-signed URLs supported via the `GET /render/v1/direct` endpoint.
*   **Webhooks:** ✅ Basic webhook support with `callbackUrl` parameter.
*   **Worker Separation:** ✅ Standalone worker processes for true scalability.
*   **Browser Pool Optimization:** ✅ Intelligent browser reuse reduces memory by 70%.
*   **Redis Caching:** ✅ Automatic result caching with configurable TTL.
*   **SSRF Protection:** ✅ Comprehensive protection against internal network attacks.
*   **Performance Monitoring:** ✅ Built-in stats for browser pool and cache usage.
*   **API Key Management:** 🚧 Not yet implemented - currently using HMAC signatures only.
*   **Admin Dashboard:** 🚧 Not yet implemented.

---

### Migration Checklist

To migrate your integration, you will need to:

1.  **[ ] Install Redis:** The new architecture requires Redis 6.0+ for job queue management.
    ```bash
    # Docker
    docker run -d -p 6379:6379 redis:latest
    # Or install locally
    ```

2.  **[ ] Create a Webhook Endpoint:** Your application needs a new endpoint to receive the asynchronous results from PageSnap.

3.  **[ ] Update API Call Logic:**
    *   Modify your API calls to include the `callbackUrl` parameter.
    *   Update your code to handle the immediate `202 Accepted` response and store the `jobId`.
    *   Remove any logic that waits for the screenshot data in the initial response.

4.  **[ ] Implement Webhook Processing Logic:** When your webhook endpoint is called, process the result payload to retrieve the final screenshot path and metadata.

5.  **[ ] (Optional) Implement Status Polling:** For integrations where webhooks are not feasible, you can implement a polling mechanism to check the `statusUrl` periodically.

6.  **[ ] Update Environment Variables:**
    ```bash
    REDIS_URL=redis://localhost:6379
    # API keys not yet implemented - use HMAC signatures for now
    ```

7.  **[ ] Start Worker Processes:** Workers now run as separate processes for better scalability:
    ```bash
    # Start worker processes (required for job processing)
    npm run start:worker
    # You can run multiple worker processes in parallel
    ```

8.  **[ ] Configure Performance Settings:** New configuration options in `pagesnap.config.json`:
    ```json
    {
      "browserPool": {
        "maxBrowsers": 4,
        "maxPagesPerBrowser": 10,
        "browserIdleTimeout": 300000
      },
      "cache": {
        "enabled": true,
        "ttl": 3600,
        "keyPrefix": "pagesnap:cache:"
      }
    }
    ```

---

### Performance Improvements in Phase 2

1. **Browser Pooling** ✅ - Up to 70% reduction in memory usage through browser reuse
2. **Redis Caching** ✅ - Sub-second response times for cached results
3. **Worker Separation** ✅ - True horizontal scalability with separate processes
4. **SSRF Protection** ✅ - Enterprise-grade security for self-hosted deployments
5. **Graceful Shutdown** ✅ - Proper cleanup of browser and Redis connections

### Remaining Limitations

1. **No API key management** - Only HMAC signatures available
2. **No admin dashboard** - No operational visibility (Phase 3 feature)

### Breaking Changes from v0.1.0

1. **Required Redis dependency** - Application won't start without Redis connection
2. **Changed response format** - Now returns job IDs instead of direct results
3. **Webhook requirement** - Synchronous waiting no longer supported
4. **Different error handling** - Errors now reported via webhook or status endpoint

### Support

We understand this is a significant change. If you have any questions or require assistance during your migration, please open an issue on our GitHub repository.

Thank you for being a valued partner.
The PageSnap Team
