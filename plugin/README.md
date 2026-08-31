# WordPress Plugin — Step 7 performance candidate

Plugin source lives in `plugin/thmt-banner-system/`.

## Hotfix v0.6.1
The first real-site Gate B test exposed two integration problems that the clean WordPress test did not reproduce:

- heavy scroll/jank from large animated GIF workload plus unthrottled layout reads;
- TOP sticky row being covered by a theme's fixed/sticky header.

This candidate fixes them without changing the locked V9 slot counts or rotation contract.

### Performance changes
- MIDDLE starts as five placeholders and only mounts its GIFs within 300px of the viewport.
- MIDDLE GIFs are removed again when the zone moves far off-screen.
- Scroll/resize layout work is coalesced to one requestAnimationFrame pass.
- Fixed/sticky backdrop blur is removed.
- Banner replacement is load-first: the previous good GIF stays visible until the next GIF is ready.

### Theme-header compatibility
The TOP sticky offset now detects common fixed/sticky WordPress header/nav containers and sits below their visible bottom edge instead of being hidden behind them.

### Preserved behavior
- V9: TOP 2 / LEFT 2 / RIGHT 2 / MIDDLE 5 / BOTTOM 2.
- Sequential rotation at the configured 5 seconds.
- GitHub sync/cache + last-known-good fallback.
- `object-fit: contain`; no crop/stretch.
- Empty brand URL = non-clickable.
