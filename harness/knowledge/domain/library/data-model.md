# Library — Data Model

Persistence shape for the `library` bounded context. Read this file only when working on repositories, Mongo schemas, or migrations.

This file is the canonical source for **collection layout, field types, defaults, on-write transforms, indexes, tenancy enforcement, and migration**. It is **not** the source for invariants, value-object values, or aggregate behaviour:

- Aggregate boundaries, conceptual state, and invariants → [domain-model.md](domain-model.md).
- Value-object values, per-value meanings, and the `UploadStatus` state machine → [language.md](language.md).

The persistence layer faithfully serialises the single aggregate root defined in [domain-model.md](domain-model.md) — `Library` — across **two collections**: one for the root, and one for its internal `Artifact` entities. Storing artifacts in a separate collection (rather than embedded in the library document) is a deliberate choice — see [Why two collections for one aggregate](#why-two-collections-for-one-aggregate). The aggregate boundary is preserved at the application/repository layer: external callers go through `LibraryRepo` only; `Artifact` has no separate repository port.

## Storage

- **Database:** MongoDB.
- **ODM:** Typegoose, with Zod for runtime validation on read and write (passed to the base `Repository<TDocument, TEntity>` constructor — see [`repositories-conventions.md`](../../repo-architecture/backend/repositories-conventions.md)).
- **Identifiers:** UUID v4 stored as a top-level `id: string` field on every document. Mongo's auto-generated `_id` is not used as the domain identifier and is ignored by application code. Matches the convention established in `user/data-model.md`.
- **Timestamps:** every document carries `createdAt` and `updatedAt` (managed via Typegoose `timestamps: true`).
- **Soft delete:** `Library` carries `isActive: boolean` (default `true`). `Artifact` does not carry `isActive`; its lifecycle is the `uploadStatus` state machine (with `removed` as the soft-deletion terminal state).
- **Tenant scope:** `libraries` carries `userId` directly. `artifacts` does **not** — its tenancy is derived from its parent library via `libraryId`. See the [Tenancy Rule](#tenancy-rule).
- **Embedded value objects:** `sourceFile` is stored inline on the artifact document as an embedded sub-document (`{ storageUri, byteSize, mimeType, sha256Hash }`); the four fields are immutable for the artifact's lifetime.
- **`storageUri` scheme (v1):** the domain treats `storageUri` as opaque, but in v1 (GR-002) the canonical scheme is `gridfs://<ObjectId>`, where `<ObjectId>` is the `_id` of the GridFS file in the `artifacts` bucket. Parsing of the scheme happens only inside `library-mongo.repo.ts`; no other module knows it exists. If the storage backend changes (e.g. S3, a `pdf-storage.gateway.ts`), only that repo and the URI scheme update.
- **v1 default library:** GR-002 auto-provisions a single Default library named `"My Library"` per user on first sign-in/upload. The data model still supports many libraries per user; the v1 product just doesn't expose UI to create more.

## Collections

| Collection | Aggregate / Entity | Tenant-scoped? | Soft delete? |
|------------|--------------------|----------------|--------------|
| `libraries` | `Library` (aggregate root) | Yes — direct (`userId`) | Yes (`isActive`) |
| `artifacts` | `Artifact` (internal entity of `Library`) | Yes — derived (via `libraryId` → `libraries.userId`) | State-machine terminal (`uploadStatus = removed`) |

## Why two collections for one aggregate

`Artifact` is an internal entity of the `Library` aggregate (per [domain-model.md](domain-model.md)), but it is **not** stored embedded in the library document. The split is a persistence-shape decision driven by three pressures:

1. **Document size.** A library can grow to hundreds of artifacts; each artifact carries non-trivial metadata (`sourceFile`, `pageCount`, status timestamps). Embedding would push library documents toward MongoDB's 16 MB limit and make every read of the library scan all artifact metadata.
2. **Update contention.** Upload-status transitions on individual artifacts happen frequently and concurrently (parallel processing). Embedding would force a write of the entire library document on every artifact transition.
3. **Read patterns.** The library overview lists artifacts paginated and filtered by `uploadStatus` and `kind`. Querying an embedded array efficiently requires `$elemMatch`-style projections; a separate collection serves these queries with a normal index.

The aggregate boundary is preserved at the application/repository layer:

- External callers see only `LibraryRepo`. There is no `ArtifactRepo` port — artifacts are reached only through library-scoped methods (`listArtifactsForLibrary`, `addArtifactToLibrary`, `updateArtifactStatus`, `removeArtifact`, `getArtifactById`).
- `LibraryRepo` reads and writes both collections internally; it is the only place in the codebase that knows the `artifacts` collection exists.
- All artifact writes are tenant-scoped via the parent library check (see [Tenancy Rule](#tenancy-rule)). There is no in-collection write to `artifacts` that does not first verify the parent library belongs to the requesting tenant.

The same persistence-shape choice — internal entity with its own collection, single repository at the aggregate boundary — applies in the [`chat` context for `ChatMessage`](../chat/data-model.md).

## `libraries` Collection

Backs the `Library` aggregate root. Each document belongs to exactly one user. Field-level invariants live in [domain-model.md#library](domain-model.md#library).

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | `string` (UUID v4) | yes | Aggregate id. The value used as `libraryId` in cross-context references. |
| `userId` | `string` (UUID v4) | yes | Tenant scope; FK to `users.id`. |
| `name` | `string` | yes | Trimmed on write. |
| `description` | `string` | no | Free-text. |
| `isActive` | `boolean` | yes | Default `true`. Soft-delete flag. |
| `createdAt` | `Date` | yes | Creation timestamp. |
| `updatedAt` | `Date` | yes | Last-modified timestamp. |

**Indexes:**

- `id` — unique.
- `userId` — non-unique (every tenant-scoped query filters on it).
- `(userId, nameLower)` — compound unique on a derived `nameLower` shadow field (set on write to `name.trim().toLowerCase()`). *Enforces invariant:* the case-insensitive in-tenant `name` uniqueness invariant on `Library`. The shadow field is not exposed on the domain entity; it exists only on the Mongo document for the index.

`isActive` is filtered at the application layer; no `isActive`-bearing index pre-emptively.

## `artifacts` Collection

Backs the `Artifact` internal entity of the `Library` aggregate. Each document belongs to exactly one library; tenancy is inherited from that library (the document does not carry its own `userId`). Field-level invariants live in [domain-model.md#artifact](domain-model.md#artifact); upload-status transitions live in [language.md#uploadstatus](language.md#uploadstatus).

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | `string` (UUID v4) | yes | Entity id. The `artifactId` half of the cross-context `(libraryId, artifactId)` pair. |
| `libraryId` | `string` (UUID v4) | yes | FK to `libraries.id`. The sole tenancy and parent reference. |
| `title` | `string` | yes | Trimmed on write. Defaulted at upload time to the source filename without extension. |
| `kind` | `string` (enum) | yes | Closed-set string. Values: see [language.md#artifactkind](language.md#artifactkind). |
| `uploadStatus` | `string` (enum) | yes | Closed-set string. Values and allowed transitions: see [language.md#uploadstatus](language.md#uploadstatus). |
| `sourceFile` | `{ storageUri: string, byteSize: number, mimeType: string, sha256Hash: string }` | yes | Embedded sub-document. `sha256Hash` is stored lower-cased hex. All four fields immutable for the entity's lifetime. |
| `pageCount` | `number` (integer ≥ 1) | conditional | Required when `uploadStatus` is `ready`; absent otherwise. Cross-field invariant; see [domain-model.md#artifact](domain-model.md#artifact). |
| `uploadedAt` | `Date` | yes | Upload-initiation timestamp. |
| `processedAt` | `Date` | conditional | Set if and only if `uploadStatus` is `ready`. Cross-field invariant; see [domain-model.md#artifact](domain-model.md#artifact). |
| `createdAt` | `Date` | yes | Document-creation timestamp. Equals `uploadedAt` in practice; carried separately for uniformity with other collections. |
| `updatedAt` | `Date` | yes | Last-modified timestamp. |

**Indexes:**

- `id` — unique.
- `libraryId` — non-unique (`listArtifactsForLibrary` is the primary read pattern).
- `(libraryId, sourceFile.sha256Hash)` — compound unique. *Enforces invariant:* the within-library upload de-duplication invariant on `Artifact`. Cross-library duplicates are explicitly allowed.
- `(libraryId, uploadStatus, kind)` — compound non-unique; *serves read pattern:* the library-overview listing query (filter artifacts in a library by status and category, e.g. only `ready` artifacts of `kind = research`).

## Tenancy Rule

Every tenant-scoped read and write **must** be scoped to a `userId`. Repository adapters in this context are responsible for enforcing this; callers must pass the tenant id explicitly. There is no implicit/global query.

- `libraries` filters `userId` directly on the query.
- `artifacts` has no `userId` field. `LibraryRepo` artifact methods take a `userId` and enforce tenancy at the application/repository layer by **first** resolving the parent library (via an internal `_getLibraryById(userId, libraryId)` that filters by `userId`) and rejecting the call if no such library exists in the requesting tenant. Once the library is verified, the artifact query is by `libraryId` alone (or by `id` after asserting the loaded artifact's `libraryId` belongs to the verified library).

This is the **derived-via-parent** tenancy pattern documented in [`add-domain-entity.md`](../../../skills/development/add-domain-entity.md) (Step 2 rules), chosen here because artifacts are conceptually a child of library, the path to the tenant is unambiguous via `libraryId`, and a duplicated `userId` on the artifact document would only re-introduce a cross-tenant equality invariant the database cannot enforce.

## Repository Ports & Adapters

Per the harness convention ([`repositories-conventions.md`](../../repo-architecture/backend/repositories-conventions.md), [`add-domain-entity.md`](../../../skills/development/add-domain-entity.md)):

- A single domain port `domain/library/library.repo.ts` exposes both library- and artifact-level operations (because `Artifact` is internal to the `Library` aggregate, it has no separate port).
- Two Typegoose models in `infrastructure/repositories/library/` — one per collection — each `implements` the corresponding domain type (`Library` and `Artifact`).
- A single adapter `infrastructure/repositories/library/library-mongo.repo.ts` implements the port; it knows about both collections and is the only place artifact-collection access happens.

| Aggregate / Entity | Port (domain) | Model (infrastructure) | Adapter (infrastructure) |
|--------------------|---------------|------------------------|--------------------------|
| `Library` (root) | `library.repo.ts` | `library-mongo.model.ts` | `library-mongo.repo.ts` |
| `Artifact` (internal entity) | *(none — internal)* | `artifact-mongo.model.ts` | *(handled inside `library-mongo.repo.ts`)* |

Method names speak the domain language. A representative (non-exhaustive) shape of `LibraryRepo`:

- Library-level: `getById(userId, libraryId)`, `listForUser(userId)`, `findByName(userId, name)`, `save(library)`, `deactivate(userId, libraryId)`.
- Artifact-level (always tenant-scoped via `userId`): `addArtifactToLibrary(userId, libraryId, artifact)`, `getArtifactById(userId, libraryId, artifactId)`, `listArtifactsForLibrary(userId, libraryId, { uploadStatus?, kind? })`, `findArtifactByHash(userId, libraryId, sha256Hash)`, `updateArtifactStatus(userId, libraryId, artifactId, nextStatus, { pageCount?, processedAt? })`, `removeArtifact(userId, libraryId, artifactId)`.

None of these methods betray Mongo (`insertOne`, `aggregate`, …). Adapters return domain entities, never `DocumentType`s.

## Migration Plan

**Strategy: greenfield.** No production data exists; the schema is created from scratch on first deploy of every environment.

### Phase 1 — Drop legacy

No legacy. Skip.

### Phase 2 — Create new collections and indexes

Create the two new collections with the indexes specified above. Indexes are declared via Typegoose `@prop` decorators on each model class and applied automatically by the ODM on first connect; the migration does not need to issue `createIndex` directly. Verify post-deploy with `db.<collection>.getIndexes()` that the unique and compound indexes are present.

| Collection | Indexes to verify |
|------------|-------------------|
| `libraries` | `id` unique; `userId`; `(userId, nameLower)` compound unique |
| `artifacts` | `id` unique; `libraryId`; `(libraryId, sourceFile.sha256Hash)` compound unique; `(libraryId, uploadStatus, kind)` compound |

### Phase 3 — Seed (per environment)

For local and dev environments, optionally seed a small library per seeded user with one or two example artifacts in `uploadStatus: ready` so the library overview is not empty on first login. Production seeds nothing — libraries are user-created.

Seeding lives in dedicated init scripts (not in the application server), invoked manually per environment.

### Phase 4 — Code cutover

The schema, repository, and application service ship together as a single deploy:

- Add the `Library` and `Artifact` entities under `domain/library/`.
- Add the single `LibraryRepo` port under `domain/library/library.repo.ts`.
- Add the two Typegoose models and the single adapter under `infrastructure/repositories/library/`.
- Wire the adapter in `main/application.instances.ts` (it depends on `UserRepo` only for tenancy assertions at the application-service layer, not at the repo layer — the repo trusts the `userId` it is handed).

### Phase 5 — Cross-context cleanup

The `chat` context will reference `libraryId` and the pair `(libraryId, artifactId)`. For greenfield this is a non-issue.

### Roll-back

Roll-back is "revert the deploy and drop the `libraries` and `artifacts` collections in the rolled-back environment." There is no in-place revert.
