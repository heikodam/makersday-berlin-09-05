# Infrastructure

## Status

**Local development only.** Scholastic AI does not yet have a staging or production environment, no managed cloud deployment, no secrets manager, and no CI pipeline. Infrastructure docs will grow as we adopt these things; today the surface is intentionally tiny.

## Local development

- **Runtime:** the React Router v7 dev server (`npm run dev`).
- **Database:** MongoDB. Connection details (cluster, database name, env vars) live in [`harness/skills/accessing-systems/mongo-atlas.md`](../../skills/accessing-systems/mongo-atlas.md). Credentials are read from `.env` at the repo root; `.env.example` lists the required keys.
- **Build verification:** `npm run typecheck` and `npm run build`. See [`skills/testing/run-code-checks.md`](../../skills/testing/run-code-checks.md).

## Active integrations (GR-002)

### PDF blob storage — GridFS (`infrastructure/gateways/library/gridfs-pdf-storage.adapter.ts`)

- **Port:** `application/library/pdf-storage.gateway.ts` (`PdfStorageGateway`).
- **Adapter:** `GridFsPdfStorageAdapter` — stores raw PDF bytes in MongoDB GridFS (bucket name `pdfs`). URI scheme `gridfs://<ObjectId>` is parsed only inside this adapter.
- **Config:** no additional env vars required; uses the existing `MONGODB_URI` / `MONGO_DATABASE`.
- **Limits:** max upload size set via `LIBRARY_MAX_UPLOAD_BYTES` (default 25 MB). See `.env.example`.

### PDF page-count extraction — pdf-parse v4 (`infrastructure/gateways/library/pdf-parse.adapter.ts`)

- **Port:** `application/library/pdf-parser.gateway.ts` (`PdfParserGateway`).
- **Adapter:** `PdfParseParserAdapter` — wraps the `pdf-parse` npm package (v4 class-based API). Calls `PDFParse.getInfo()` to extract `total` (page count).
- **Config:** no env vars required.

## Planned (added when adopted)

When any of the following are introduced, document them here and link from the relevant `accessing-systems/` skill:

- **Hosting / deployment** — App Runner, Fly, Render, Cloudflare, etc. (TBD)
- **Secrets management** — local `.env` only for now; cloud secrets store TBD.
- **Managed Mongo environment(s)** — staging and production Atlas projects with isolation rules. Reinstate the per-environment table below when this happens.
- **Object storage for uploaded PDFs** — S3, R2, or similar (TBD).
- **AI gateway dependencies** — embeddings provider, vector store, LLM provider, PDF parser/OCR (TBD; `library/` and `chat/` will consume these via gateways).
- **Authentication provider** (TBD).
- **CI** — type-check, build, lint, tests on PR (TBD).
- **Observability** — application logs, error tracking, RUM (TBD).
