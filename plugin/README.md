# WordPress Plugin — Step 6

Plugin source lives in `plugin/thmt-banner-system/`.

## Step 6 complete scope
- GitHub `config/banners.json` is now the control-plane source of truth.
- Each WordPress site keeps:
  - a hot transient cache,
  - a persistent last-known-good config,
  - the bundled plugin snapshot as the final fallback.
- Sync interval comes from `system.github_sync_interval_seconds` (currently 300 seconds).
- Conditional HTTP requests use ETag / Last-Modified when GitHub provides them.
- Failed HTTP requests, malformed JSON, unsafe URLs, unsafe asset paths, duplicate brand IDs, or V9 layout drift are rejected.
- A bad remote response never overwrites the last-known-good config.
- A short lock prevents multiple simultaneous frontend requests from stampeding GitHub.
- Background WP-Cron wakes every five minutes; request-time cache expiry also guarantees refresh when a site is actively visited.
- Step 5 sequential rotation remains unchanged.
- V9 layout remains unchanged.
- Future brand 15+ can be added through GitHub without rebuilding the plugin as long as each brand satisfies the same asset contract.

## Cache / fallback order

```text
fresh transient
    ↓ expired
GitHub conditional fetch
    ↓ failure
last-known-good option
    ↓ unavailable
bundled config snapshot
```

## Central update path

```text
GitHub config/banners.json
        ↓
WordPress sync
        ↓
validation
        ↓
last-known-good
        ↓
transient cache
        ↓
renderer + rotation
```

## Still intentionally NOT done
- No production-site acceptance test yet — Step 7.
- No final release ZIP yet — Step 8.
