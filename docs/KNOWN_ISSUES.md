# Known Issues

This document tracks known issues and limitations for the PageSnap tool.

---

### 1. Persistent Banners and Popups

**Issue ID:** `KB-001`

**Description:**
Some websites, notably `earlymountain.com`, employ advanced techniques to ensure the visibility of certain elements, such as cookie consent banners. These elements can persist in the final screenshot despite multiple sanitization attempts.

**Analysis:**
The persistence is likely due to the website's JavaScript framework (e.g., React, Vue) re-hydrating the component and re-inserting it into the DOM after our sanitization scripts have run. The scripts may also use inline styles with `!important` or other methods to override external attempts to hide the element.

**Strategies Attempted:**
The following sanitization methods were attempted, both individually and in combination, without successfully removing the banner on all test sites:
-   **CSS Selector Hiding:** Using `display: none;` on targeted selectors.
-   **CSS Injection:** Adding a stylesheet with `display: none !important;` to the page head.
-   **DOM Element Removal:** Repeatedly removing the element from the DOM using a script.
-   **User-Agent Modification:** Simulating a standard browser User-Agent string.

**Current Status:**
The issue remains unresolved for the most persistent cases. The implemented two-stage sanitization (CSS injection + aggressive removal) is effective on many sites but not all.

**Workaround:**
As suggested by the user, the recommended workaround is to use the **region capture** feature (to be implemented in a future phase) to manually select an area of the page that excludes the persistent banner.
