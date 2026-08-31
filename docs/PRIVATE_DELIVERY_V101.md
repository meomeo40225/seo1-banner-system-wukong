# Step 9 — Private GitHub Delivery via Cloudflare Pages

Status: PREPARED / NOT YET MERGED

Goal:

```
Private GitHub
  -> Cloudflare Pages Git integration
  -> public static delivery (*.pages.dev or custom domain)
  -> WordPress plugin
```

## Why Pages

- No VPS or hosting is required.
- No R2 bucket is required.
- Only public delivery assets are published: `config/`, `media/`, `assets/`.
- Plugin source, docs, scripts, commit history, and the private GitHub repository are not part of the Pages output.

## Cloudflare Pages build settings

Use the repository:

`meomeo40225/seo1-banner-system-wukong`

For the first test:

- Production branch: `step9-private-delivery-v101`
- Build command: `bash scripts/build_pages_delivery.sh`
- Build output directory: `public-delivery`
- Root directory: repository root / leave blank

After the delivery path and plugin pass real-site acceptance, merge Step 9 into `main`, switch Pages production branch to `main`, re-test, then make GitHub private.

## Safety rule

Do not make the GitHub repository private until:

1. Pages deploy succeeds.
2. `/config/banners.json`, `/media/**`, and `/assets/**` are publicly reachable from the Pages domain.
3. Plugin is patched to the Pages delivery origin.
4. Real-site acceptance passes.
5. A post-private deployment test passes with the Cloudflare GitHub App still authorized for this repository.

Stable V1.0.0 on `main` remains untouched until the new delivery path passes.
