# Conversation Summaries — GR-002 Library PDF Upload

## Planning session: 2026-05-09

### Task definition
Ticket `jira-tickets/todo/gr_002_library_pdf_upload.md` was used as the canonical source. It is fully specified: endpoints, validation rules, acceptance criteria, domain references, and design references are all unambiguous.

### Key design decisions

**Single `LibraryRepo` port for both collections and GridFS**
The harness `knowledge/domain/library/data-model.md` explicitly states: "Single LibraryRepo port handles both collections; no separate ArtifactRepo." This means the one adapter (`LibraryMongoRepo`) extends `Repository<LibraryMongoDocument, Library>` for the primary collection, holds a second Typegoose model reference for `artifacts`, and manages a `GridFSBucket` for binary file storage. No separate `ArtifactRepo` or `FileStorageGateway` was created — that would contradict the domain's stated design.

**`nameLower` shadow field**
The `libraries` collection requires a `(userId, nameLower)` compound unique index to enforce case-insensitive library name uniqueness per user. `nameLower` is a derived, persistence-only field: it is NOT part of the domain `Library` entity. The repo adapter computes it (`name.toLowerCase()`) and injects it via `$set` before any insert/upsert. This keeps the domain entity clean.

**`findOrCreateDefaultLibrary` upsert shape**
Initial design used a plain `$set` upsert. During critique, it was noted that a plain `$set` upsert on a new document would overwrite `id` if two concurrent calls both trigger the insert path. The fix is `$setOnInsert: { id: crypto.randomUUID(), createdAt: now }` combined with `$set` for the mutable fields. The unique index on `(userId, nameLower)` ensures at most one document is created.

**busboy stays in the route layer**
Multipart parsing is an HTTP transport concern — it belongs in the route handler, not the application service or controller. The route:
1. Parses the multipart body with `busboy`
2. Buffers the file into a `Buffer`
3. Passes `(buffer, filename, mimeType)` to the controller
The controller receives clean domain inputs, with no knowledge of the wire format.

**`byteSize` removed from service signature**
Originally the plan had `uploadArtifact(userId, buffer, filename, mimeType, byteSize)`. During critique, it was noted this creates a redundant parameter that could diverge from `buffer.length`. The fix: derive `byteSize = buffer.length` inside the service; remove it from the signature entirely.

**`sourceFile.mimeType` always hardcoded to `'application/pdf'`**
The browser-supplied MIME type from the multipart header is not trusted (per ticket spec). After the `%PDF-` magic-byte check passes, the service always stores `mimeType: 'application/pdf'` in `SourceFile` regardless of what the browser sent.

**`PdfParser` as an injected gateway port**
The ticket explicitly states pdf-parse should be "injected into LibraryService so the application ring stays free of the parser dependency." A `PdfParser` interface lives in `application/library/pdf-parser.ts`. `PdfParseAdapter` (wrapping the `pdf-parse` npm package) lives in `infrastructure/gateways/pdf-parse/` and is wired in `application.instances.ts`. This keeps the application layer independently testable.

**pdf-parse failure rollback**
If `pdfParser.getPageCount(buffer)` throws after the file has already been stored in GridFS and the artifact saved, the service must clean up:
1. `repo.deleteFile(storageUri)` — remove GridFS chunks
2. `repo.deleteArtifact(artifactId)` — remove artifact document
3. Re-throw as `InvalidFileTypeError`

This prevents orphaned GridFS entries and half-saved artifacts.

**Auth pattern: `enforceAuth` directly, not middleware array**
The `add-page-route.md` skill shows a `middleware = [requireAuth(loginController)]` pattern, but the existing codebase does not implement the React Router middleware array — `auth-middleware.server.ts` exports only `enforceAuth` and `unauthenticatedJson`. All routes call `enforceAuth(loginController, request)` at the top of their loader/action. This plan follows the existing pattern.

**Hard delete for artifacts**
The domain model says "soft deletes only" for Libraries (they are deactivated, never deleted). For Artifacts, the ticket is explicit: "DELETE — removes the artifact and its GridFS chunks." The plan implements a hard delete (GridFS first, then artifact document), consistent with the ticket's stated behaviour.

**`@index` decorators on Typegoose models**
Compound indexes were initially described in prose only, which creates risk of a Coding Agent missing them. After critique they are spelled out with concrete `@index` decorator syntax on the model classes:
- `@index({ userId: 1, nameLower: 1 }, { unique: true })` on `LibraryMongoModel`
- `@index({ libraryId: 1, 'sourceFile.sha256Hash': 1 }, { unique: true })` on `ArtifactMongoModel`
- `@index({ libraryId: 1, uploadStatus: 1, kind: 1 })` on `ArtifactMongoModel`

**SDK transport split**
`callUploadArtifactAPI` uses raw `fetch` with `FormData` (multipart/form-data). The other SDK functions use `requestInternalAPI` (JSON). This split is intentional and documented — `requestInternalAPI` handles JSON only and cannot send multipart.

**Missing `file` field guard**
busboy will simply not emit a `file` event if the client sends a multipart body with no `file` field. Without an explicit guard, the action would hang or silently pass an empty buffer. The plan adds a `fileReceived` boolean that the busboy `finish` handler checks before proceeding.

### Critique triage
All 6 critique points were accepted by the human without modification:
1. Guard for missing `file` field in multipart → accepted
2. Explicit `@index` decorator examples → accepted
3. `findOrCreateDefaultLibrary` `$setOnInsert` upsert shape → accepted
4. SDK transport split documentation → accepted
5. Remove `byteSize` from service signature → accepted
6. Always hardcode `sourceFile.mimeType = 'application/pdf'` → accepted
