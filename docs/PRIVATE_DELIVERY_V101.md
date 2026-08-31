# Step 9 — Private GitHub Delivery via Cloudflare R2

Status: PREPARED / NOT YET MERGED

Goal:

```
Private GitHub
  -> GitHub Actions
  -> Cloudflare R2 public delivery
  -> WordPress plugin
```

## Safety rule

Do not make the GitHub repository private until:

1. R2 bucket exists.
2. R2 credentials are stored as GitHub Actions secrets.
3. Public R2/custom-domain URL serves config + media + assets.
4. Plugin is patched to the new public delivery base URL.
5. Real-site acceptance passes.

Stable V1.0.0 on `main` remains untouched until the new delivery path passes.

## GitHub Actions secrets required

- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET`

Use an R2 token limited to Object Read & Write for this bucket only.

## Uploaded paths

- `config/banners.json`
- `media/**`
- `assets/**`

The plugin currently still points to raw.githubusercontent.com. That is intentional until the public R2/custom-domain endpoint is known and tested.
