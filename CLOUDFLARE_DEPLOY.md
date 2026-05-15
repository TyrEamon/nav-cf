# Cloudflare Pages Deployment

This repo was originally built as Vue + Express + SQLite + local uploads.
The Cloudflare version keeps the frontend flow mostly unchanged:

- API: Cloudflare Pages Functions
- Database: Cloudflare D1
- Uploaded files: optional Cloudflare R2
- Frontend: Cloudflare Pages static build

## 1. Create Cloudflare resources

```bash
cd web
npx wrangler d1 create nav-item
```

Copy the `database_id` from the `d1 create` output into `web/wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "nav-item"
database_id = "replace-with-your-real-database-id"
```

## 2. Create D1 tables

Use a fresh D1 database when importing an old `nav.db`.

```bash
cd web
npx wrangler d1 execute nav-item --remote --file=schema.sql
```

## 3. Import old nav.db data

Put your old SQLite database at `database/nav.db`, or pass its full path to the script:

```bash
cd ..
node scripts/export-sqlite-for-d1.mjs database/nav.db web/d1-data.sql
cd web
npx wrangler d1 execute nav-item --remote --file=d1-data.sql
```

The export includes menus, sub-menus, cards, users, ads, and friend links.
User passwords are kept as the original bcrypt hashes, so the old login should still work after import.

## 4. Set JWT_SECRET

In Cloudflare Pages, add this environment variable:

```text
JWT_SECRET=use-a-long-random-secret-here
```

Path: Pages project -> Settings -> Environment variables.

## 5. Cloudflare Pages build settings

```text
Root directory: web
Build command: npm run build
Build output directory: dist
```

The D1 binding is defined in `web/wrangler.toml`.

## 6. Local preview

```bash
cd web
npm install
npm run build
npx wrangler pages dev dist
```

## Upload notes

- The original Express/Docker deployment files are still kept.
- The Cloudflare version does not use the local `uploads/` directory.
- R2 is optional. Add it only if you need uploaded logo/file storage.
- If old database rows contain `custom_logo_path`, add an R2 binding named `UPLOADS` and upload the matching old files to R2 with the same object key.
