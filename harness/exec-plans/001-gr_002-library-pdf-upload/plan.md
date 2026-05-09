# GR-002 — Library PDF Upload

## Context

GR-002 implements the full vertical slice for library PDF upload — the data ingestion layer that makes Scholastic AI useful. Without it, the chat feature (GR-003) has no documents to ground on. The feature adds MongoDB GridFS binary storage, domain entities for `Library` and `Artifact`, an application service with all validation logic, four REST endpoints, and the complete `/library` UI screen (sidebar nav, drag-and-drop upload zone, "Recent Documents" card grid).

The existing `app/routes/pages/library.tsx` is a stub ("coming soon") — it will be replaced entirely.

---

## New Packages Required

```
npm install busboy pdf-parse
npm install -D @types/busboy @types/pdf-parse
```

- `busboy` — streaming multipart parser for the upload endpoint
- `pdf-parse` — extracts page count from buffered PDF; injected into LibraryService via a port so the application ring stays dependency-free

---

## Files

### New files

**Shared types** (UI needs these enums)
- `app/shared/domain/library/artifact-status.ts`
- `app/shared/domain/library/artifact-kind.ts`

**Domain layer**
- `app/backend.server/domain/library/library.ts`
- `app/backend.server/domain/library/artifact.ts`
- `app/backend.server/domain/library/library.repo.ts`

**Application layer**
- `app/backend.server/application/library/config.ts`
- `app/backend.server/application/library/errors.ts`
- `app/backend.server/application/library/pdf-parser.ts` (gateway port)
- `app/backend.server/application/library/library.dto.ts`
- `app/backend.server/application/library/library.service.ts`

**Infrastructure — repositories**
- `app/backend.server/infrastructure/repositories/library/library-mongo.model.ts`
- `app/backend.server/infrastructure/repositories/library/artifact-mongo.model.ts`
- `app/backend.server/infrastructure/repositories/library/library-mongo.repo.ts`

**Infrastructure — gateways**
- `app/backend.server/infrastructure/gateways/pdf-parse/pdf-parse.adapter.ts`

**Infrastructure — API controller**
- `app/backend.server/infrastructure/api/library.controller.ts`

**API routes + SDK**
- `app/routes/api/api.library.artifacts.upload.ts`
- `app/routes/api/api.library.artifacts.ts`
- `app/routes/api/api.library.artifacts.$artifactId.ts`
- `app/routes/api/api.library.artifacts._sdk.ts`

**UI components**
- `app/ui.client/components/domain/library/LibraryView.tsx`
- `app/ui.client/components/domain/library/UploadZone.tsx`
- `app/ui.client/components/domain/library/DocumentCard.tsx`
- `app/ui.client/components/domain/library/hooks/use-upload.ts`

**Tests**
- `tests/backend.server/application/library/library.service.test.ts`

### Modified files

- `app/backend.server/main/run-config.ts` — add `LibraryConfig` slice
- `app/backend.server/main/application.instances.ts` — wire `libraryRepo`, `libraryService`, `pdfParseAdapter`
- `app/backend.server/main/controller.instances.ts` — wire `libraryController`
- `app/routes/pages/library.tsx` — replace stub with loader + thin component

---

## Implementation Approach

### 1. Shared enums

```typescript
// app/shared/domain/library/artifact-status.ts
export const ARTIFACT_STATUS = ['uploading', 'processing', 'ready', 'failed', 'removed'] as const;
export type ArtifactStatus = typeof ARTIFACT_STATUS[number];

// app/shared/domain/library/artifact-kind.ts
export const ARTIFACT_KIND = ['pdf', 'research', 'article', 'dataset', 'book'] as const;
export type ArtifactKind = typeof ARTIFACT_KIND[number];
```

---

### 2. Domain entities

**`library.ts`** — camelCase throughout (per ticket and existing user.ts pattern). `nameLower` is a persistence-only shadow field and does NOT appear in the domain entity.

```typescript
export const librarySchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string().min(1).max(255),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Library = z.infer<typeof librarySchema>;
```

**`artifact.ts`** — `SourceFile` is a nested value object. `ArtifactStatus` and `ArtifactKind` are re-exported from `@shared/domain/library/`. Export helper predicates:

```typescript
export const sourceFileSchema = z.object({
  storageUri: z.string(),   // opaque; canonical form is gridfs://<ObjectId>
  byteSize: z.number().int().positive(),
  mimeType: z.string(),
  sha256Hash: z.string().length(64),
});

export const artifactSchema = z.object({
  id: z.string().uuid(),
  libraryId: z.string().uuid(),
  title: z.string().min(1),
  kind: z.enum(ARTIFACT_KIND),
  uploadStatus: z.enum(ARTIFACT_STATUS),
  sourceFile: sourceFileSchema,
  pageCount: z.number().int().positive().optional(),
  uploadedAt: z.date(),
  processedAt: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Artifact = z.infer<typeof artifactSchema>;

export function isReady(artifact: Artifact): boolean { return artifact.uploadStatus === 'ready'; }
```

**`library.repo.ts`** — single port for both collections and GridFS file storage:

```typescript
export interface LibraryRepo {
  findOrCreateDefaultLibrary(userId: string): Promise<Library>;
  findArtifactBySha256(libraryId: string, sha256Hash: string): Promise<Artifact | null>;
  listArtifacts(libraryId: string): Promise<Artifact[]>;
  getArtifact(libraryId: string, artifactId: string): Promise<Artifact | null>;
  saveArtifact(artifact: Artifact): Promise<Artifact>;
  deleteArtifact(artifactId: string): Promise<void>;
  storeFile(buffer: Buffer, filename: string, mimeType: string): Promise<string>;  // returns gridfs://<ObjectId>
  readFile(storageUri: string): Promise<Buffer>;
  deleteFile(storageUri: string): Promise<void>;
}
```

---

### 3. Application layer

**`config.ts`** — LibraryConfig class following the AuthConfig pattern:

```typescript
export class LibraryConfig {
  constructor(readonly maxUploadBytes: number) {}

  static fromEnv(): LibraryConfig {
    const env = readFromEnv(z.object({
      LIBRARY_MAX_UPLOAD_BYTES: z.coerce.number().int().positive().default(26_214_400), // 25 MB
    }));
    return new LibraryConfig(env.LIBRARY_MAX_UPLOAD_BYTES);
  }
}
```

**`errors.ts`** — domain-meaningful error classes for controller/route to translate to HTTP status codes:

```typescript
export class FileTooSmallError extends Error {}          // → 400
export class FileTooLargeError extends Error {}          // → 413
export class InvalidFileTypeError extends Error {}       // → 415
export class DuplicateArtifactError extends Error {}     // → 409
export class ArtifactNotFoundError extends Error {}      // → 404
```

**`pdf-parser.ts`** — gateway port (lives in application layer per harness conventions):

```typescript
export interface PdfParser {
  getPageCount(buffer: Buffer): Promise<number>;
}
```

**`library.dto.ts`** — ArtifactDto mirrors the artifact shape for the API response:

```typescript
export interface ArtifactDto {
  id: string;
  libraryId: string;
  title: string;
  kind: ArtifactKind;
  uploadStatus: ArtifactStatus;
  pageCount?: number;
  byteSize: number;
  uploadedAt: string;   // ISO string — safe to serialise across HTTP boundary
  processedAt?: string;
}

export function toArtifactDto(artifact: Artifact): ArtifactDto { ... }
```

**`library.service.ts`** — all business logic lives here:

Upload flow (`uploadArtifact(userId, buffer, filename, mimeType)`):

Note: `byteSize` is derived from `buffer.length` inside the service — it is NOT a parameter, preventing any possibility of caller mismatch.

1. Derive `byteSize = buffer.length`
2. Guard: `byteSize < 10_240` → `FileTooSmallError`
3. Guard: `byteSize > config.maxUploadBytes` → `FileTooLargeError`
4. Guard: first 5 bytes of buffer ≠ `%PDF-` → `InvalidFileTypeError`
5. After magic-byte check passes, always store `sourceFile.mimeType = 'application/pdf'` — discard the browser-supplied MIME type (untrusted)
6. Compute SHA-256 with `node:crypto` `createHash('sha256').update(buffer).digest('hex')`
7. `repo.findOrCreateDefaultLibrary(userId)` → get `libraryId`
8. `repo.findArtifactBySha256(libraryId, sha256Hash)` → if found → `DuplicateArtifactError`
9. `repo.storeFile(buffer, filename, 'application/pdf')` → `storageUri`
10. Build Artifact with `uploadStatus: 'processing'`, save via `repo.saveArtifact`
11. Extract page count: `pdfParser.getPageCount(buffer)`, update artifact to `ready` + set `pageCount` + `processedAt`. On parser failure: delete file via `repo.deleteFile(storageUri)` + delete artifact via `repo.deleteArtifact` + re-throw as `InvalidFileTypeError`
12. Return `toArtifactDto(updatedArtifact)`

Other methods:
- `listArtifacts(userId)` — find/create default library, list artifacts, return DTOs sorted newest first
- `getArtifactFile(userId, artifactId)` — resolve default library, get artifact (throw `ArtifactNotFoundError` if absent), read file via `repo.readFile`, return `{ buffer, mimeType: 'application/pdf', filename: artifact.title }`
- `deleteArtifact(userId, artifactId)` — resolve default library, get artifact, delete GridFS file via `repo.deleteFile(artifact.sourceFile.storageUri)`, then hard-delete artifact document via `repo.deleteArtifact`

---

### 4. Infrastructure: Typegoose models

**`library-mongo.model.ts`**:

```typescript
@index({ userId: 1, nameLower: 1 }, { unique: true })
@modelOptions({ schemaOptions: { timestamps: true, versionKey: false }, options: { allowMixed: Severity.ALLOW } })
export class LibraryMongoModel implements Library {
  @prop({ unique: true, required: true, type: String }) id!: string;
  @prop({ required: true, type: String, index: true }) userId!: string;
  @prop({ required: true, type: String }) name!: string;
  @prop({ required: true, type: String }) nameLower!: string;  // shadow field for unique index; not in domain entity
  @prop({ required: true, type: Date }) createdAt!: Date;
  @prop({ required: true, type: Date }) updatedAt!: Date;
}
export type LibraryMongoDocument = DocumentType<LibraryMongoModel>;
```

**`artifact-mongo.model.ts`** — `SourceFileMongo` nested class + `ArtifactMongoModel`:

```typescript
class SourceFileMongo implements SourceFile {
  @prop({ required: true, type: String }) storageUri!: string;
  @prop({ required: true, type: Number }) byteSize!: number;
  @prop({ required: true, type: String }) mimeType!: string;
  @prop({ required: true, type: String }) sha256Hash!: string;
}

@index({ libraryId: 1, 'sourceFile.sha256Hash': 1 }, { unique: true })
@index({ libraryId: 1, uploadStatus: 1, kind: 1 })
@modelOptions({ schemaOptions: { timestamps: true, versionKey: false }, options: { allowMixed: Severity.ALLOW } })
export class ArtifactMongoModel implements Artifact {
  @prop({ unique: true, required: true, type: String }) id!: string;
  @prop({ required: true, type: String, index: true }) libraryId!: string;
  @prop({ required: true, type: String }) title!: string;
  @prop({ required: true, type: String }) kind!: ArtifactKind;
  @prop({ required: true, type: String }) uploadStatus!: ArtifactStatus;
  @prop({ required: true, type: SourceFileMongo, _id: false }) sourceFile!: SourceFile;
  @prop({ type: Number }) pageCount?: number;
  @prop({ required: true, type: Date }) uploadedAt!: Date;
  @prop({ type: Date }) processedAt?: Date;
  @prop({ required: true, type: Date }) createdAt!: Date;
  @prop({ required: true, type: Date }) updatedAt!: Date;
}
export type ArtifactMongoDocument = DocumentType<ArtifactMongoModel>;
```

---

### 5. Infrastructure: LibraryMongoRepo

Extends `Repository<LibraryMongoDocument, Library>` (primary collection = `libraries`). Holds a second model reference for `artifacts` and a lazily-initialised `GridFSBucket`.

```typescript
export class LibraryMongoRepo
  extends Repository<LibraryMongoDocument, Library>
  implements LibraryRepo
{
  private readonly artifactModel: Model<ArtifactMongoDocument>;
  private gridFSBucket: GridFSBucket | null = null;

  constructor(mongoClient: MongoDBClient) {
    super({ entityClass: LibraryMongoModel, mongoClient, modelName: 'libraries', zodSchema: librarySchema });
    this.artifactModel = getModelForClass(ArtifactMongoModel, {
      options: { customName: 'artifacts' },
    }) as unknown as Model<ArtifactMongoDocument>;
  }

  private getGridFSBucket(): GridFSBucket {
    if (!this.gridFSBucket) {
      // mongoose.connection.db is available after ensureConnection()
      this.gridFSBucket = new GridFSBucket(mongoose.connection.db!, { bucketName: 'pdfs' });
    }
    return this.gridFSBucket;
  }
}
```

`findOrCreateDefaultLibrary`: uses `model.findOneAndUpdate` with `{ upsert: true, new: true }`. Filter on `{ userId, nameLower: 'my library' }`. Update shape:

```typescript
{
  $set: { userId, name: 'My Library', nameLower: 'my library', updatedAt: now },
  $setOnInsert: { id: crypto.randomUUID(), createdAt: now },
}
```

This prevents `id` from being overwritten on concurrent upserts. After upsert, call `documentToEntity` to return a `Library`.

`storeFile`: pipe buffer into GridFS via `bucket.openUploadStream(filename, { contentType: mimeType })`, collect the ObjectId from the `finish` event, return `gridfs://${id.toString()}`.

`readFile` / `deleteFile`: parse ObjectId from `storageUri` using:
```typescript
const objectId = new ObjectId(storageUri.replace('gridfs://', ''));
```
`readFile` opens a download stream and collects chunks into a single `Buffer`. `deleteFile` calls `bucket.delete(objectId)`.

`listArtifacts`: `this.artifactModel.find({ libraryId }).sort({ createdAt: -1 })` → map via `artifactSchema.parse`.

`saveArtifact`: upsert on `{ id: artifact.id }` using `$set`.

`deleteArtifact`: `this.artifactModel.deleteOne({ id: artifactId })`.

`findArtifactBySha256`: `this.artifactModel.findOne({ libraryId, 'sourceFile.sha256Hash': sha256Hash })`.

`getArtifact`: `this.artifactModel.findOne({ libraryId, id: artifactId })`.

---

### 6. Infrastructure: PdfParseAdapter

```typescript
// app/backend.server/infrastructure/gateways/pdf-parse/pdf-parse.adapter.ts
import pdfParse from 'pdf-parse';
import type { PdfParser } from '@backend-application/library/pdf-parser';

export class PdfParseAdapter implements PdfParser {
  async getPageCount(buffer: Buffer): Promise<number> {
    const result = await pdfParse(buffer);
    return result.numpages;
  }
}
```

---

### 7. Infrastructure: LibraryController

Thin driving adapter. Passes through to the service; caller (route) maps domain errors to HTTP status codes.

```typescript
export class LibraryController {
  constructor(private readonly libraryService: LibraryService) {}

  async upload(userId: string, buffer: Buffer, filename: string, mimeType: string) {
    return this.libraryService.uploadArtifact(userId, buffer, filename, mimeType);
  }

  async listArtifacts(userId: string) {
    return this.libraryService.listArtifacts(userId);
  }

  async getArtifactFile(userId: string, artifactId: string) {
    return this.libraryService.getArtifactFile(userId, artifactId);
  }

  async deleteArtifact(userId: string, artifactId: string) {
    return this.libraryService.deleteArtifact(userId, artifactId);
  }
}
```

---

### 8. Composition root wiring

**`run-config.ts`** — add `library: LibraryConfig.fromEnv()` to `AppConfig` constructor and `fromEnv`.

**`application.instances.ts`** — add to `buildApplicationInstances`:
```typescript
const pdfParser = new PdfParseAdapter();
const libraryRepo = new LibraryMongoRepo(mongoClient);
const libraryService = new LibraryService(config.library, libraryRepo, pdfParser);
```
Return `libraryService` in the instances object.

**`controller.instances.ts`** — add:
```typescript
export const libraryController = new LibraryController(app.libraryService);
```

---

### 9. API Routes

**`api.library.artifacts.upload.ts`** — `POST /api/library/artifacts/upload`

Multipart parsing with busboy (transport concern — stays in route, not controller):
1. Check `Content-Type` starts with `multipart/form-data` → else 400
2. Create busboy instance with `limits: { files: 1, fileSize: config.library.maxUploadBytes + 1 }` to detect oversize early
3. Pipe `Readable.fromWeb(request.body)` through busboy
4. Collect file field named `file` into chunks array; track `truncated` flag and `fileReceived` boolean
5. On busboy `finish`: if `!fileReceived` → return `data({ error: 'No file provided' }, { status: 400 })`
6. On busboy `finish`: if `truncated` → return `data({ error: 'File exceeds the 25 MB limit' }, { status: 413 })`
7. Call `libraryController.upload(ctx.user.id, buffer, filename, mimeType)` and map domain errors:
   - `FileTooSmallError` → 400 `"File is too small to be a valid PDF"`
   - `FileTooLargeError` → 413 `"File exceeds the 25 MB limit"`
   - `InvalidFileTypeError` → 415 `"Only PDF files are supported"`
   - `DuplicateArtifactError` → 409 `"This document is already in your library"`
8. On success → `data({ artifact }, { status: 200 })`

Auth: `enforceAuth(loginController, request)` at top of action — **not** middleware array (not implemented in this codebase).

**`api.library.artifacts.ts`** — `GET /api/library/artifacts`

Loader: `enforceAuth` → `libraryController.listArtifacts(ctx.user.id)` → `data({ artifacts })`.

**`api.library.artifacts.$artifactId.ts`** — `GET + DELETE /api/library/artifacts/:artifactId`

- Loader (GET): `enforceAuth` → `libraryController.getArtifactFile(ctx.user.id, params.artifactId)` → `new Response(buffer, { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'inline' } })`
- Action (DELETE): `enforceAuth` → `libraryController.deleteArtifact(ctx.user.id, params.artifactId)` → `data({ ok: true })`

Both use `params.artifactId` from the route segment.

**`api.library.artifacts._sdk.ts`** — client SDK:

```typescript
export async function callUploadArtifactAPI(file: File): Promise<{ artifact: ArtifactDto }> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch('/api/library/artifacts/upload', { method: 'POST', body: form });
  if (!res.ok) { const { error } = await res.json(); throw new Error(error); }
  return res.json();
}

export function callListArtifactsAPI(): Promise<{ artifacts: ArtifactDto[] }> {
  return requestInternalAPI('/api/library/artifacts', 'GET', ...);
}

export function callDeleteArtifactAPI(artifactId: string): Promise<void> {
  return requestInternalAPI(`/api/library/artifacts/${artifactId}`, 'DELETE', ...);
}
```

SDK transport split (intentional): raw `fetch` + `FormData` for upload (multipart); `requestInternalAPI` (JSON) for list and delete.

---

### 10. Page Route: `library.tsx`

Replace stub entirely:
```typescript
export const meta = () => [{ title: 'Scholastic AI | Library' }];

export async function loader({ request }: LoaderFunctionArgs) {
  const ctx = await enforceAuth(loginController, request);
  const artifacts = await libraryController.listArtifacts(ctx.user.id);
  return { user: toAuthenticatedUserDto(ctx.user), artifacts };
}

export default function LibraryPage() {
  const { artifacts } = useLoaderData<typeof loader>();
  return <LibraryView initialArtifacts={artifacts} />;
}
```

---

### 11. UI Components

**`LibraryView.tsx`** — root layout matching `designs/library_scholastic_ai/screen.png`:
- Fixed `w-[280px]` left sidebar with Library (active) / Chat (`aria-disabled`) / History (`aria-disabled`) nav items
- Sticky `h-16` top header with disabled search input, notification icon, settings icon, user avatar
- Main scrollable content: `<UploadZone>` at top + "Recent Documents" heading + responsive grid of `<DocumentCard>`
- Grid: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6`
- Manages `artifacts` in `useState` (seeded from `initialArtifacts` prop). Passes `onUploadSuccess` to UploadZone (prepend) and `onDelete` to DocumentCard (filter out).

**`UploadZone.tsx`** — drag-and-drop zone:
- Dashed border: `border-2 border-dashed border-outline rounded-2xl`
- `onDragOver` / `onDragLeave`: toggle `isDragging` state for hover style (`border-primary bg-surface-container`)
- `onDrop` / file input `onChange`: call `useUpload.upload(file)`
- Hidden `<input type="file" accept="application/pdf">` triggered by "Browse Files" button
- Show `CircularProgress` spinner (or equivalent) while `isUploading`
- Show inline error message when `error` is set

**`DocumentCard.tsx`** — card showing:
- `picture_as_pdf` Material Symbol icon as cover placeholder
- Title (truncated to 2 lines)
- Mint green "PDF" tag: `bg-functional text-on-functional text-label-caps`
- Upload date formatted as `dd MMM yyyy`
- Overflow menu (three-dot) with a single "Delete" action that calls `onDelete(artifact.id)` → `callDeleteArtifactAPI`

**`hooks/use-upload.ts`**:
```typescript
export function useUpload(onSuccess: (artifact: ArtifactDto) => void) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setIsUploading(true);
    setError(null);
    try {
      const { artifact } = await callUploadArtifactAPI(file);
      onSuccess(artifact);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  }
  return { upload, isUploading, error };
}
```

---

## Design token mapping

From `designs/library_intelligence_system/DESIGN.md` and `tailwind.config.ts`:

| Design concept | Tailwind class |
|---|---|
| Sidebar 280px | `w-[280px]` |
| Header 64px | `h-16` |
| Primary (Dark Petrol #002127) | `bg-primary` / `text-primary` |
| Accent (Dark Periwinkle #08006f) | `text-accent` |
| Mint Green tag | `bg-functional text-on-functional` |
| Dashed upload zone | `border-2 border-dashed border-outline` |
| Upload hover state | `border-primary bg-surface-container` |
| Card border | `border border-outline-variant` |
| Sidebar active item | `bg-secondary-container text-on-secondary-container` |

---

## Test strategy

**`tests/backend.server/application/library/library.service.test.ts`**

Tests warranted (custom logic beyond stock Zod):
- Upload: rejects file < 10 KB → `FileTooSmallError`
- Upload: rejects file > maxUploadBytes → `FileTooLargeError`
- Upload: rejects file without `%PDF-` magic bytes → `InvalidFileTypeError`
- Upload: rejects SHA-256 duplicate → `DuplicateArtifactError`
- Upload: happy path → artifact saved with `ready` status, DTO returned
- Upload: pdf-parse failure → GridFS file deleted, artifact deleted, re-throws `InvalidFileTypeError`
- `listArtifacts`: returns DTOs newest-first

Use an in-memory fake `LibraryRepo` (implements the port) and a fake `PdfParser`. No MongoDB.

---

## Resolved decisions

| Decision | Resolution |
|---|---|
| `nameLower` in domain entity? | No — persistence-only shadow field, set by repo adapter before insert |
| busboy in route vs application service | Route layer — it's an HTTP/transport concern; controller receives `Buffer` |
| GridFS access pattern | `LibraryMongoRepo` holds a lazy-initialised `GridFSBucket` via `mongoose.connection.db` (available after `ensureConnection()`) |
| SHA-256 dedupe race | Unique index `(libraryId, sourceFile.sha256Hash)` is the authoritative guard; pre-check is a fast-path optimisation |
| pdf-parse failure rollback | Service catches parser error, deletes GridFS file + artifact, re-throws as `InvalidFileTypeError` |
| Auth pattern | `enforceAuth` called directly in each route handler — matches existing library.tsx pattern; middleware array not implemented in this codebase |
| `storageUri` parsing | `gridfs://<ObjectId>` parsed only inside `LibraryMongoRepo.readFile`/`deleteFile` via `new ObjectId(uri.replace('gridfs://', ''))` |
| Single `LibraryRepo` for both collections | Yes — per `harness/knowledge/domain/library/data-model.md`: "Single LibraryRepo port handles both collections; no separate ArtifactRepo" |
| Default library creation | `findOrCreateDefaultLibrary` uses `findOneAndUpdate` upsert with `$set` + `$setOnInsert` to prevent id overwrite on concurrent calls |
| `byteSize` source | Derived from `buffer.length` inside service — not passed as a parameter |
| `sourceFile.mimeType` | Always stored as `'application/pdf'` (hardcoded after magic-byte check); browser-supplied MIME is discarded |
| Missing `file` field in multipart | busboy handler returns 400 `"No file provided"` if no `file` field received |
| Compound indexes | Applied via `@index` decorators on Typegoose model classes |
| Artifact delete | Hard delete: GridFS chunks deleted first, then artifact document removed |

---

## Verification

1. `npm run typecheck` — zero errors
2. `npm run build` — clean build
3. `npm run test` — library.service unit tests pass
4. `npm run dev` → navigate to `http://localhost:5173/library`
5. Upload a valid PDF (> 10 KB, < 25 MB) → card appears immediately; persists after reload
6. Upload same PDF again → toast "This document is already in your library"
7. Upload a non-PDF renamed to `.pdf` → toast "Only PDF files are supported"
8. Upload a file > 25 MB → toast "File exceeds the 25 MB limit"
9. Delete a card → removed from grid
10. MongoDB `libraries`, `artifacts`, `pdfs.files`, `pdfs.chunks` collections all have correct data
