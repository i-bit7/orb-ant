---
name: GitHub repository
description: GitHub remote for this project and how to push via Replit connector
---

# GitHub Repository

**URL:** https://github.com/i-bit7/orb-ant  
**Owner:** i-bit7  
**Repo:** orb-ant  
**Default branch:** main

## How to push (Replit connector — no raw token available)

Use the GitHub Git Data API via `connectors.proxy("github", ...)` from a Node.js script at the workspace root. The flow:

1. `GET /repos/{owner}/{repo}/git/refs/heads/main` → get parent SHA
2. For files >80 KB: `POST /repos/{owner}/{repo}/git/blobs` (base64)
3. `POST /repos/{owner}/{repo}/git/trees` with all 186 file entries (inline content for small files, blob SHA for large ones)
4. `POST /repos/{owner}/{repo}/git/commits` with parent SHA + tree SHA
5. `PATCH /repos/{owner}/{repo}/git/refs/heads/main` with `force: true`

**Why:** The Replit GitHub connector does not expose the raw OAuth token — only the Replit JWT header is accessible via `getProxyHeaders()`. The `gh` CLI and `git` credential helpers cannot authenticate. The Git Data API via the proxy is the only reliable push path.

**Note:** For a brand-new empty repo, the `git/blobs` API returns 409 "Git Repository is empty." Seed it first with at least one file via the Contents API (`PUT /repos/{owner}/{repo}/contents/{path}`), then switch to the Git Data API flow above.
