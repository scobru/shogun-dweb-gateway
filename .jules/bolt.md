## 2025-05-15 - [ESLint Broken]
**Learning:** The project's `yarn lint` command fails due to missing eslint config file, even though `eslint` is installed.
**Action:** When running checks, prioritize `yarn build` for correctness verification until linting is fixed. Do not rely on `lint` passing.

## 2025-05-15 - [Startup Performance]
**Learning:** Initializing GunDB/ShogunCore with dynamic relays fetched over network blocks app interactivity significantly.
**Action:** Use stale-while-revalidate strategy (localStorage cache) to unblock startup immediately, fetching updates in background.
