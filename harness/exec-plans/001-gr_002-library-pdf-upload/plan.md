---
name: GR-002 Library PDF Upload & Browse
ticket: jira-tickets/todo/gr_002_library_pdf_upload.md
branch: feat/library-pdf-upload
reviewer: marduSwanepoel
merge-policy: all 5 slices must land before merge
---

# GR-002 — Library PDF upload & browse

## 1. Overview

Implement GR-002 in alignment with the harness `library` bounded context: full `Library` aggregate (with auto-provisioned single Default library per user for v1 UX), `Artifact` internal entity persisted across two collections (`libraries`, `artifacts`), proper `PdfStorageGateway` and `PdfParserGateway` ports with GridFS / `pdf-parse` adapters, and a 1:1 implementation of `designs/library_scholastic_ai/screen.png`. Build proceeds in **five TDD-sliced increments**; all five must land before merge.

## 2. Decisions resolved during planning

| # | Decision | Choice | Rationale |
|---|---|---|---|
| D1 | Aggregate shape | Full `Library` aggregate with `Artifact` internal entity. Auto-provision a single `"My Library"` per user lazily on first upload. | Evans: model fidelity required for GR-003 citations. Cagan: v1 UX hides multi-library; model still correct. |
| D2 | GridFS placement | `PdfStorageGateway` port (`application/library/`) + `GridFsPdfStorageAdapter` (`infrastructure/gateways/library/`). `LibraryMongoRepo` does not touch GridFS. | Cockburn: prior plan flagged this as a manifesto divergence; the workshop reset is the moment to fix it. |
| D3 | PDF parser placement | `PdfParserGateway` port + `PdfParseParserAdapter`. | Same reasoning as D2. Replaces prior "injected function" with a properly named port. |
| D4 | Status transitions | Synchronous in-request: `processing` → `ready` (or `failed`). | Cagan/Beck: no evidence async is needed; ship simplest. |
| D5 | Dedupe | Two-layer: `findArtifactByHash` short-circuit + `(libraryId, sourceFile.sha256Hash)` unique index catches the race. | AC 8 + race correctness. |
| D6 | SHA-256 location | Computed in `LibraryService` over the buffered bytes — **not** in the storage adapter. `PdfStorageGateway.putPdf(buffer)` returns just `{ storageUri }`. | Cockburn-aligned: storage adapter stays a thin bytes-in/bytes-out port; future S3 adapter doesn't reimplement hashing. |
| D7 | Validation layering | `Content-Length` pre-check in **controller** (transport-level). Magic-byte + min-size + max-size in **service** (domain-level, single buffered pass). Storage adapter does **no** validation. | Critique #3 — keeps each layer's responsibility singular. |
| D8 | Multipart parser | `busboy` streaming from `Readable.fromWeb(request.body)` with `limits.fileSize = maxByteSize + 1`. | RR's `unstable_parseMultipartFormData` materialises the file in memory; `busboy` streams. |
| D9 | Test strategy | App-service tests with in-memory port doubles. `mongodb-memory-server` integration tests starting in **slice 2** (one happy-path round-trip), expanding in slices 4 (dedupe race) and 5 (GridFS cleanup). One jsdom render test for `LibraryView` in slice 1. | Beck: integration tests exist where in-memory faking would lie. Critique #1 + #4 — accepted. |
| D10 | Shared kernel | **Don't** create `app/shared/` for GR-002. Inline request/response Zod shapes in `api.library.artifacts._sdk.ts`, matching `api.auth._sdk.ts`. | Critique #5 — `app/shared/` lands when GR-003 actually needs cross-process types. |
| D11 | URI scheme | `storageUri = "gridfs://<ObjectId>"` is parsed only inside `gridfs-pdf-storage.adapter.ts`. Domain treats it as opaque. The repo persists it as a string. | Critique #7 — adapter owns its scheme. |
| D12 | Multi-library UX | Deferred. | Per ticket §"Out of scope". |
| D13 | UI component file shape | Flat-file pattern (`LibraryView.tsx` next to `hooks/`), matching the existing `LoginView.tsx`. The harness skill `add-ui-component.md` prescribes `ComponentName/index.tsx + types.ts`; we deviate to match the codebase's actual style. | Surgical-changes principle: match existing style. |
| D14 | Branch / reviewer / merge policy | `feat/library-pdf-upload`, reviewer `marduSwanepoel`, all 5 slices land before merge. | User-confirmed. |

## 3. Vertical slices (TDD increments)

Each slice is a complete red-green-refactor cycle. Slices commit in order; each commit must `npm run typecheck` and `npm run test` clean.

### Slice 1 — Empty library page renders behind auth

**Behaviour added.** `/library` (already authed) now renders the real `LibraryView` skeleton: sidebar (Library active, Chat/History `aria-disabled`), top app bar with disabled search, dashed empty dropzone, "Recent Documents" header with empty grid. No persistence, no upload.

**Why first.** Proves route + UI wiring without committing to backend code yet.

**Files added.**

- `app/ui.client/components/domain/library/LibraryView.tsx`
- `app/ui.client/components/domain/library/Sidebar.tsx`
- `app/ui.client/components/domain/library/TopAppBar.tsx`
- `app/ui.client/components/domain/library/UploadDropzone.tsx` (visual only)
- `app/ui.client/components/domain/library/DocumentGrid.tsx` (renders empty state)

**Files modified.**

- `app/routes/pages/library.tsx` — replace placeholder, render `<LibraryView artifacts={[]} />`. Loader unchanged.

**Tests added.**

- `tests/ui.client/components/domain/library/library-view.test.tsx` — jsdom + `@testing-library/react` render test asserting the dropzone, sidebar items (Library / Chat / History), empty-state copy, and disabled search are present.
- `package.json` adds `@testing-library/react`, `@testing-library/jest-dom`, `jsdom` to `devDependencies`.
- `vitest.config.ts` — add `environment: 'jsdom'` for `.test.tsx` files (and continue `node` env for backend tests via per-file or path-scoped config).

**Manual.** Visual smoke against `designs/library_scholastic_ai/screen.png` for ACs 1–3.

---

### Slice 2 — Upload one valid PDF; it persists end-to-end

**Behaviour added.** User drops or browses a valid PDF (passes magic-byte sniff). It uploads, stores, transitions to `ready`, and appears at the top of the grid. Reload preserves it. Auto-provisions the user's Default library on first upload. **No size validation, no dedupe, no delete yet** — those land in subsequent slices.

**Why next.** End-to-end happy path: multipart → service → storage gateway → repo → parser gateway → UI revalidation. Deliberately narrow.

**Files added (backend).**

- `app/backend.server/domain/library/library.ts` — `Library` entity + Zod schema (per `harness/knowledge/domain/library/data-model.md#libraries-collection`).
- `app/backend.server/domain/library/artifact.ts` — `Artifact` entity, `SourceFile` value object, `ArtifactKind` and `UploadStatus` enums. `.superRefine` enforces the `pageCount`/`processedAt` ↔ `uploadStatus === "ready"` cross-field invariant.
- `app/backend.server/domain/library/library.repo.ts` — `LibraryRepo` port with domain-language methods: `getDefaultForUser`, `ensureDefaultForUser`, `addArtifactToLibrary`, `getArtifactById`, `listArtifactsForLibrary`, `findArtifactByHash`, `updateArtifactStatus`, `removeArtifact`. No method names betray Mongo.
- `app/backend.server/application/library/pdf-storage.gateway.ts` — port: `putPdf(buffer: Buffer): Promise<{ storageUri: string }>`, `openPdfStream(storageUri: string): Promise<Readable>`, `deletePdf(storageUri: string): Promise<void>`.
- `app/backend.server/application/library/pdf-parser.gateway.ts` — port: `parsePdf(buffer: Buffer): Promise<{ pageCount: number }>`.
- `app/backend.server/application/library/library.service.ts` — `LibraryService.uploadArtifact({ userId, fileName, mimeType, stream })` orchestration:
  1. Buffer first 8 bytes from the stream → magic-byte check (`%PDF-`).
  2. Continue draining stream into a `Buffer` (slice 3 adds size guards).
  3. Compute SHA-256 over the buffer.
  4. `ensureDefaultForUser(userId)` → `Library`.
  5. `pdfStorage.putPdf(buffer)` → `storageUri`.
  6. `repo.addArtifactToLibrary(userId, libraryId, artifact)` with `uploadStatus: "processing"`, `sha256Hash`, `byteSize: buffer.length`, `storageUri`.
  7. `pdfParser.parsePdf(buffer)` → `pageCount`.
  8. `repo.updateArtifactStatus(..., { status: "ready", pageCount, processedAt: clock() })`.
  9. On any failure after step 5: `pdfStorage.deletePdf(storageUri)` (cleanup orphan), set status `failed`, surface error.
- `app/backend.server/application/library/library.dto.ts` — `ArtifactDto`, `LibraryDto`, mappers `toArtifactDto`, `toLibraryDto`.
- `app/backend.server/application/library/errors.ts` — `InvalidPdfError`, `PdfParseError`. (More added slice 3.)
- `app/backend.server/application/library/config.ts` — `LibraryConfig` (`defaultLibraryName: "My Library"`, `minByteSize`, `maxByteSize` — enforced from slice 3). `fromEnv` reads `LIBRARY_MAX_UPLOAD_BYTES` (optional override).
- `app/backend.server/infrastructure/repositories/library/library-mongo.model.ts` — Typegoose `LibraryMongoModel implements Library`. `nameLower` shadow field with `(userId, nameLower)` compound unique index.
- `app/backend.server/infrastructure/repositories/library/artifact-mongo.model.ts` — Typegoose `ArtifactMongoModel implements Artifact`, embedded `SourceFile` subdoc, indexes from `data-model.md#artifacts-collection`: `id` unique, `libraryId`, `(libraryId, sourceFile.sha256Hash)` unique, `(libraryId, uploadStatus, kind)`.
- `app/backend.server/infrastructure/repositories/library/library-mongo.repo.ts` — `LibraryMongoRepo extends Repository<...> implements LibraryRepo`. Owns both collections; **does not touch GridFS**. Tenancy enforced by always loading the parent library by `(userId, libraryId)` first (per `data-model.md#tenancy-rule`).
- `app/backend.server/infrastructure/gateways/library/gridfs-pdf-storage.adapter.ts` — implements `PdfStorageGateway` using `mongoose.mongo.GridFSBucket`. Owns the `gridfs://<ObjectId>` URI scheme (parsing isolated to this file's header-documented helper). Pure bytes-in / bytes-out — no validation, no hashing.
- `app/backend.server/infrastructure/gateways/library/pdf-parse.adapter.ts` — implements `PdfParserGateway` using `pdf-parse`.
- `app/backend.server/infrastructure/api/library/library.controller.ts` — `LibraryController.uploadArtifact(request)` (busboy multipart parse → service call → DTO response), `listArtifacts(request)`. Per-method ≤ ~15 lines.
- `app/backend.server/infrastructure/api/library/multipart.ts` — pure busboy wrapper.

**Files added (routes/UI).**

- `app/routes/api/api.library.artifacts.ts` — `loader` (list). DELETE action lands in slice 5.
- `app/routes/api/api.library.artifacts.upload.ts` — `action` (POST upload).
- `app/routes/api/api.library.artifacts._sdk.ts` — `callUploadArtifactApi(file)`, `callListArtifactsApi`. Inline Zod schemas (no `app/shared/`).
- `app/ui.client/components/domain/library/DocumentCard.tsx` — single-card render.
- `app/ui.client/components/domain/library/hooks/use-upload-artifact.ts` — `useFetcher`-backed uploader.

**Files modified.**

- `app/backend.server/main/run-config.ts` — add `library: LibraryConfig`.
- `app/backend.server/main/application.instances.ts` — instantiate `GridFsPdfStorageAdapter`, `PdfParseParserAdapter`, `LibraryMongoRepo`, `LibraryService`.
- `app/backend.server/main/controller.instances.ts` — export `libraryController`.
- `app/routes/pages/library.tsx` — loader fetches initial artifact list via `libraryController`, passes to `<LibraryView artifacts={...} />`.
- `package.json` — add `busboy`, `pdf-parse`, `uuid`, `@types/busboy`, `@types/pdf-parse`, `mongodb-memory-server` (devDep).
- `.env.example` — `LIBRARY_MAX_UPLOAD_BYTES=26214400` (placeholder; enforced from slice 3).
- `harness/knowledge/infra/infrastructure.md` — add entries for GridFS storage and `pdf-parse` integrations (per `add-gateway-integration.md` Step 5).

**Tests added.**

- `tests/backend.server/application/library/library.service.test.ts` — happy-path upload, `listArtifactsForLibrary` newest-first, `ensureDefaultForUser` idempotence. Uses `InMemoryLibraryRepo` + `InMemoryPdfStorageGateway` + deterministic `parsePdf` fake.
- `tests/backend.server/doubles/in-memory-library-repo.ts`
- `tests/backend.server/doubles/in-memory-pdf-storage.gateway.ts`
- `tests/backend.server/doubles/fake-pdf-parser.gateway.ts`
- `tests/backend.server/infrastructure/repositories/library/library-mongo.repo.integration.test.ts` — first integration test: upload → list → fetch by id, against `mongodb-memory-server`.
- `tests/setup/mongo-memory-server.ts` — boots in-process Mongo per test suite, exposes a connection string for `MongoDBClient`. Pinned Mongo version documented in the file header.
- `vitest.config.ts` — register the integration setup file scoped to `*.integration.test.ts` glob.

---

### Slice 3 — Validation rules (ACs 5, 6, 7)

**Behaviour added.**

- AC 5 — File < 10 KB → 400 `"File is too small to be a valid PDF"` (`FileTooSmallError`).
- AC 6 — File > 25 MB → 413 `"File exceeds the 25 MB limit"`. Enforced **before** body fully read: controller checks `Content-Length`; busboy `limits.fileSize` catches misreports.
- AC 7 — Failing `%PDF-` magic-byte → 415 `"Only PDF files are supported"` (`InvalidPdfError`).
- Validation errors surface as toasts in the UI.

**Files modified.**

- `library.service.ts` — wire min/max-size checks in the buffered pass; magic-byte stays here (already from slice 2).
- `library.controller.ts` — `Content-Length` pre-check before invoking busboy; busboy `limits.fileSize = config.maxByteSize + 1`.
- `errors.ts` — add `FileTooSmallError`, `FileTooLargeError`.
- `api.library.artifacts._sdk.ts` — typed error responses.
- `LibraryView.tsx` / `use-upload-artifact.ts` / new `hooks/use-document-toasts.ts` — toast queue (presentational toaster lives in `LibraryView.tsx`).

**Tests added.**

- App-service tests: `rejects with FileTooSmallError`, `rejects with FileTooLargeError`, `rejects with InvalidPdfError on bad magic byte`.
- Controller test (mocking the service): `Content-Length > limit returns 413 without reading body`.

---

### Slice 4 — Dedupe (AC 8)

**Behaviour added.** Uploading a file whose SHA-256 already exists in the user's Default library → 409 `"This document is already in your library"` (`DuplicateArtifactError`).

**Files modified.**

- `library.service.ts` — `findArtifactByHash` short-circuit (common case); catch `code: 11000` from `addArtifactToLibrary` and re-throw `DuplicateArtifactError`; on the rare race after the GridFS write succeeded, call `pdfStorage.deletePdf(storageUri)` for cleanup.
- `errors.ts` — add `DuplicateArtifactError`.
- `library.controller.ts` — map to 409.

**Tests added.**

- App-service test: common-case dedupe via `findArtifactByHash`.
- Integration test in `library-mongo.repo.integration.test.ts`: two concurrent inserts of the same hash → exactly one succeeds, the other throws `code: 11000`.

---

### Slice 5 — Delete artifact + GridFS cleanup (AC 10)

**Behaviour added.** Card overflow menu "Delete" calls `DELETE /api/library/artifacts/:artifactId`. Artifact transitions to `removed` (terminal). Both the artifact document **and** its GridFS file are gone.

**Files added.**

- `app/routes/api/api.library.artifacts.$artifactId.ts` — `loader` streams the original PDF (`Content-Type: application/pdf`, `Content-Disposition: inline`); `action` handles `DELETE`.

**Files modified.**

- `library.service.ts` — `removeArtifact(userId, artifactId)`: fetch under tenant, transition to `removed`, call `pdfStorage.deletePdf(storageUri)`, save.
- `library.controller.ts` — wire delete + stream methods.
- `library.repo.ts` + `library-mongo.repo.ts` — finalise `removeArtifact`.
- `api.library.artifacts._sdk.ts` — `callDeleteArtifactApi`, `getArtifactDownloadUrl`.
- `DocumentCard.tsx` — wire overflow menu; `LibraryView.tsx` — wire delete handler.

**Tests added.**

- App-service test: delete happy path; verify status, verify `pdfStorage.deletePdf` called.
- Integration test in `library-mongo.repo.integration.test.ts`: GridFS file is actually gone after delete.

## 4. Acceptance criteria → tests

| AC | Description | Slice | Test |
|---|---|---|---|
| 1 | Visual fidelity | 1 | Manual against `designs/library_scholastic_ai/screen.png` (PR screenshot) |
| 2 | Drag & drop hover state | 1 | Manual |
| 3 | Browse files button | 1 | Manual + jsdom render test asserts the file input has `accept="application/pdf"` |
| 4 | Persistence + appears top | 2 | App-service test `lists artifacts newest-first after upload` + integration round-trip |
| 5 | < 10 KB rejection | 3 | App-service test → `FileTooSmallError`; controller test → 400 |
| 6 | > 25 MB rejection | 3 | Controller test → `Content-Length > limit` returns 413 without reading body |
| 7 | Wrong type | 3 | App-service test → `InvalidPdfError` on bad magic byte; controller maps to 415 |
| 8 | Duplicate within library | 4 | App-service (common case) + integration (race) |
| 9 | Authorisation | 2 | Loader/action behind `enforceAuth` (covered by GR-001 patterns); app-service test that user A cannot reach user B's library (parent-library lookup returns null) |
| 10 | GridFS storage + delete cleanup | 5 | Integration: file in GridFS after upload; absent after delete |

## 5. Risks & assumptions

- **`pdf-parse` correctness on malformed PDFs.** Wrap in try/catch; on failure transition artifact to `failed`, call `pdfStorage.deletePdf(storageUri)` to avoid orphan, surface `PdfParseError` → toast "Could not read PDF". Tested in slice 2.
- **Race-condition cleanup.** When the unique-index race fires after the GridFS write, the service must clean up the orphaned blob. Tested explicitly in slice 4.
- **Memory pressure during page count + hash.** Service buffers full file in memory (≤ 25 MB). Acceptable for the cap. If raised later, switch to a streaming SHA-256 transform + a streaming PDF parser.
- **`mongodb-memory-server` flake on CI.** Downloads a Mongo binary on first use; can be slow. Mitigation: pin a specific Mongo version, document in `tests/setup/mongo-memory-server.ts`, cache in CI.
- **UI test environment.** Vitest `environment: 'jsdom'` is scoped per-file (`*.test.tsx`); backend tests stay on `node`. Mis-config would silently break either side — verify in slice 1.
- **URI-scheme parsing.** `gridfs://<ObjectId>` is parsed only inside `gridfs-pdf-storage.adapter.ts`. The repo persists it as an opaque string. Documented in the adapter's file header.

## 6. Out of scope (deliberate)

- Multi-library UX (sidebar list, library creation/rename/archive).
- PDF thumbnails / cover extraction.
- `ArtifactKind` classification — every upload is `kind: "pdf"` for v1.
- Async processing (workers, queues).
- Search input wiring (rendered `disabled`).
- Multi-file batch upload progress UI.
- Sharing, permissions, folders.

## 7. Workflow next steps after approval

1. Branch `feat/library-pdf-upload` off `branch-2`.
2. Commit `harness/exec-plans/001-gr_002-library-pdf-upload/{plan.md, conversation-summaries.md}` to the branch.
3. Push, open draft PR labelled `plan`, reviewer `marduSwanepoel`.
