# SYSTEM INSTRUCTIONS & CORE RULES

## 1. PRESERVE DATABASE AND USER ACCOUNTS (CRITICAL RULE)
- **Do NOT delete, clear, or overwrite any registered users or projects** stored in `/database.json`.
- The database is live with production users accessing the platform. Any code modification to `loadDatabase()` or database bootstrapper logic must **incrementally preserve** all existing entries and never perform destructive resets.
- Always check for the presence of existing files and keep previously registered users in the database untouched.

## 2. PAYLOAD BOUNDS & COMPRESSION
- User custom uploaded images and traceable masks must be compressed using the `compressImage` utility (inside `src/utils/imageHelper.ts`) to max 800px on the longest side.
- This preserves `localStorage` limits (max 5MB) and avoids Nginx or Express `PayloadTooLargeError: request entity too large` errors during backup or sync processes.
