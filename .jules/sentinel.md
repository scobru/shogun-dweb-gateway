## 2025-02-20 - [CRITICAL] DWebViewer Sandbox Escape
**Vulnerability:** `DWebViewer` component rendered untrusted HTML from GunDB/IPFS into an iframe using `document.write()` while `allow-same-origin` was enabled in the sandbox. This allowed untrusted code to access the parent application's origin (localStorage, cookies, window object).
**Learning:** `allow-same-origin` combined with `allow-scripts` is dangerous for untrusted content, especially when the content is injected via `document.write()` (which inherits origin).
**Prevention:** Use `srcDoc` for content injection and strictly avoid `allow-same-origin` for untrusted iframes. Rely on `postMessage` for any necessary parent-child communication if strictly needed (though not needed here).
