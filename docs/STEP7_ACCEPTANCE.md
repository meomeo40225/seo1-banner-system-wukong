# Step 7 — WordPress Acceptance

Step 7 has two gates.

## Gate A — clean WordPress integration

GitHub Actions installs a clean WordPress + MariaDB instance, activates the plugin and verifies:

- plugin activation succeeds;
- GitHub `config/banners.json` reaches WordPress;
- last-known-good cache is created;
- simulated GitHub/network failure falls back safely;
- exactly 13 V9 slots render: TOP 2 / LEFT 2 / RIGHT 2 / MIDDLE 5 / BOTTOM 2;
- all 13 currently visible GIFs load from the matching brand asset path;
- `object-fit: contain` remains active;
- visitor hide controls are absent;
- side rails and bottom row remain within a 1440×1000 viewport;
- rotation is running at 5000 ms;
- the rendered brands change after one interval;
- an installable Step 7 candidate ZIP and browser screenshot are archived.

## Gate B — one real user-owned WordPress website

Gate B remains required before Step 7 can be marked complete.

Use the exact candidate ZIP produced by Gate A on one selected WordPress site. Verify desktop and mobile appearance, theme compatibility, scroll behavior and central GitHub config propagation.

Do not mark Step 7 complete and do not create Stable V1 until Gate B passes.
