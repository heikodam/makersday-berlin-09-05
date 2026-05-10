# GR-002 — Library: upload and browse PDF documents (MongoDB-backed)

- **Type:** Story
- **Epic:** Scholastic AI — Foundations
- **Priority:** P0
- **Status:** To Do
- **Estimate:** M

## Problem & why now

The whole point of Scholastic AI is to chat with *your* documents. Before chat can do anything useful, the user needs a place to add documents to their library and see what is already there. Without this screen, GR-003 (Chat) has no source material and is just a hardcoded demo with no real grounding.

## User story

> **As a** signed-in researcher,
> **I want** to drag-and-drop or browse for PDFs to add to my library, and see all my previously uploaded documents,
> **so that** I have a working corpus I can start chatting with.

## Outcome we want

A user lands on `/library`, drops a PDF onto the upload zone, sees it appear in the "Recent Documents" grid within seconds, and can confirm it persisted by reloading the page.

## Domain alignment

This ticket implements the `library` bounded context as defined in the harness:

- `harness/knowledge/domain/library/domain-model.md` — `Library` aggregate root, `Artifact` internal entity, `SourceFile` value object, `UploadStatus` state machine, `ArtifactKind` enum.
- `harness/knowledge/domain/library/data-model.md` — two collections (`libraries`, `artifacts`), tenancy rules, indexes (including `(libraryId, sourceFile.sha256Hash)` unique).
- `harness/knowledge/domain/library/language.md` — terms used here.

For v1 we **auto-provision a single Default library per user** ("My Library") on first access; multi-library UX is deferred. Field names follow the harness — `userId`, `libraryId`, `sourceFile.sha256Hash` (camelCase) — not snake_case.

## In scope

- Authenticated route `/library` matching `designs/library_scholastic_ai/screen.png`:
  - Left sidebar with Library / Chat / History nav (Library active; Chat & History rendered as `aria-disabled`).
  - Top app bar with disabled search input (search itself is **out of scope** for this ticket).
  - Drag-and-drop upload zone with a "Browse Files" button fallback and an in-flight spinner.
  - "Recent Documents" grid of document cards (title, "PDF" tag, upload date) with a per-card overflow menu Delete action.
- Backend endpoints (camelCase JSON):
  - `POST /api/library/artifacts/upload` — multipart upload of a single file under field name `file`. Auto-creates the user's Default library on first call. Stores binary in MongoDB (GridFS) and metadata in the `artifacts` collection. Returns the new `ArtifactDto`.
  - `GET /api/library/artifacts` — lists the current user's artifacts in their Default library, newest first, returns metadata DTOs only.
  - `GET /api/library/artifacts/:artifactId` — streams the original PDF (`Content-Type: application/pdf`, `Content-Disposition: inline`).
  - `DELETE /api/library/artifacts/:artifactId` — removes the artifact and its GridFS chunks (wired to a card overflow menu; minimal UI).
- Validation rules on upload:
  - **Mime type** must be `application/pdf` and the file must begin with the `%PDF-` magic-byte signature (verified server-side; the browser-supplied mime is not trusted).
  - **Minimum size:** 10 KB.
  - **Maximum size:** 25 MB per file (configurable via `LIBRARY_MAX_UPLOAD_BYTES`).
  - Reject duplicates: the same `sourceFile.sha256Hash` already in the user's Default library is rejected with a clear message.
- Surface a simple spinner while the file is uploading.

## Out of scope

- Multiple libraries per user (UI for creating/renaming/archiving libraries).
- Full-text search, OCR, semantic indexing (covered later when chat retrieval lands).
- Cover-image extraction — the design shows thumbnails, but for MVP every card uses a generic `picture_as_pdf` icon.
- Document categories / "RESEARCH / ARTICLE / DATASET / BOOK" tags — render a single neutral "PDF" tag for now (`ArtifactKind = pdf`).
- Multi-file batch upload progress UI (single file at a time is fine for MVP).
- Sharing, permissions, folders.

## Acceptance criteria

1. **Visual fidelity** — `/library` matches `designs/library_scholastic_ai/screen.png` using tokens from `designs/library_intelligence_system/DESIGN.md` (sidebar 280 px, header 64 px, dashed upload zone, card grid responsive 1/2/3/4 cols).
2. **Drag & drop** — Dragging a PDF over the zone shows a hover state (`border-primary` + `bg-surface-container`); releasing it starts the upload.
3. **Browse files** — The "Browse Files" button opens the OS file picker filtered to PDFs (`accept="application/pdf"`).
4. **Persistence** — After a successful upload, the new artifact appears at the top of "Recent Documents" without a manual refresh, and it is still there after a full reload.
5. **Validation: too small** — Uploading a < 10 KB PDF surfaces a non-blocking toast/error "File is too small to be a valid PDF" (HTTP 400).
6. **Validation: too large** — Uploading a > 25 MB file is rejected before the body is fully read (HTTP 413) with "File exceeds the 25 MB limit".
7. **Validation: wrong type** — Uploading a non-PDF (failing the `%PDF-` magic-byte check) is rejected with "Only PDF files are supported" (HTTP 415).
8. **Validation: duplicate** — Uploading a file whose SHA-256 already exists in the user's Default library is rejected with "This document is already in your library" (HTTP 409).
9. **Authorisation** — All `/api/library/*` endpoints require an authenticated session (GR-001). Users only ever see their own library's artifacts.
10. **Storage** — Files are stored in MongoDB GridFS via `LibraryMongoRepo` (not on local disk); deleting an artifact removes both the document and its GridFS chunks. The domain treats `SourceFile.storageUri` as opaque; the canonical scheme is `gridfs://<ObjectId>` and is only parsed inside the repo adapter.

## Design references

- Screen: `designs/library_scholastic_ai/screen.png`
- HTML reference: `designs/library_scholastic_ai/code.html`
- Design system (colors, typography, spacing, components): `designs/library_intelligence_system/DESIGN.md`
- Cross-screen overview: `designs/highlevel_design_overview.png`

## Technical notes

- Multipart upload is parsed with `busboy` streaming from `Readable.fromWeb(request.body)`; we do not load the multipart body twice.
- `libraries` collection schema follows `harness/knowledge/domain/library/data-model.md#libraries-collection`. A shadow `nameLower` field powers the `(userId, nameLower)` compound unique index.
- `artifacts` collection schema follows `harness/knowledge/domain/library/data-model.md#artifacts-collection`. Indexes: `id` unique, `libraryId`, `(libraryId, sourceFile.sha256Hash)` unique, `(libraryId, uploadStatus, kind)`.
- SHA-256 is computed once on the buffered upload before the artifact is persisted, allowing a fast common-case dedupe lookup; the unique index catches the rare race.
- Page count is extracted synchronously via `pdf-parse` (injected into `LibraryService` so the application ring stays free of the parser dependency). Status transitions: `processing` → `ready` (with `pageCount` and `processedAt`) on success; rolled back / removed on parser failure.

## Dependencies

- **GR-001** (auth + session) — required to scope artifacts to a user.
