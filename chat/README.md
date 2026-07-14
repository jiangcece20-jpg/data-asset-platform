# ChatBI Prototype Deployment

This folder is a standalone static project for the ChatBI prototype.

## Cloudflare Pages

Project name:

```text
data-asset-platform-chatbi
```

Deploy with Wrangler:

```bash
npx wrangler pages deploy chat --project-name data-asset-platform-chatbi --commit-dirty=true
```

## Vercel Project Settings

- Root Directory: `chat`
- Framework Preset: `Other`
- Build Command: leave empty
- Output Directory: `.`
- Install Command: leave empty

## CLI Deployment

```bash
cd chat
vercel
vercel --prod
```

When Vercel asks for the output directory, use `.`.
