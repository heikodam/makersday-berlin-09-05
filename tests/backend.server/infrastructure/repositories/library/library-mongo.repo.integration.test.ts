import { describe, it, expect, beforeAll, afterAll } from "vitest";
import mongoose from "mongoose";
import { MongoDBClient } from "@backend-platform/infrastructure/mongo/client";
import { LibraryMongoRepo } from "@backend-infrastructure/repositories/library/library-mongo.repo";
import { startMongoMemoryServer, stopMongoMemoryServer } from "../../../../setup/mongo-memory-server";
import type { Artifact } from "@backend-domain/library/artifact";

const USER_ID = "00000000-0000-4000-8000-000000000001";
const PDF_MAGIC = Buffer.from([0x25, 0x50, 0x44, 0x46]);

function makeArtifact(overrides: Partial<Artifact> = {}): Artifact {
  const now = new Date();
  return {
    id: crypto.randomUUID(),
    libraryId: "",
    title: "Test Document",
    kind: "pdf",
    uploadStatus: "processing",
    sourceFile: {
      storageUri: `gridfs://${new mongoose.Types.ObjectId().toString()}`,
      byteSize: 11 * 1024,
      mimeType: "application/pdf",
      sha256Hash: crypto.randomUUID().replace(/-/g, ""),
    },
    uploadedAt: now,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("LibraryMongoRepo (integration)", () => {
  let repo: LibraryMongoRepo;
  let mongoUri: string;

  beforeAll(async () => {
    mongoUri = await startMongoMemoryServer();
    const client = new MongoDBClient(mongoUri, "test");
    repo = new LibraryMongoRepo(client);
  });

  afterAll(async () => {
    await stopMongoMemoryServer();
  });

  it("ensureDefaultForUser creates a library and is idempotent", async () => {
    const lib1 = await repo.ensureDefaultForUser(USER_ID, "My Library");
    expect(lib1.name).toBe("My Library");
    expect(lib1.userId).toBe(USER_ID);

    const lib2 = await repo.ensureDefaultForUser(USER_ID, "My Library");
    expect(lib2.id).toBe(lib1.id);
  });

  it("addArtifactToLibrary then getArtifactById round-trip", async () => {
    const lib = await repo.ensureDefaultForUser(USER_ID, "My Library");
    const artifact = makeArtifact({ libraryId: lib.id });

    await repo.addArtifactToLibrary(USER_ID, lib.id, artifact);
    const fetched = await repo.getArtifactById(USER_ID, lib.id, artifact.id);

    expect(fetched).not.toBeNull();
    expect(fetched!.id).toBe(artifact.id);
    expect(fetched!.title).toBe(artifact.title);
  });

  it("listArtifactsForLibrary returns newest-first", async () => {
    const userId = "00000000-0000-4000-8000-000000000002";
    const lib = await repo.ensureDefaultForUser(userId, "My Library");

    const a1 = makeArtifact({ libraryId: lib.id, uploadedAt: new Date("2026-01-01") });
    const a2 = makeArtifact({ libraryId: lib.id, uploadedAt: new Date("2026-01-02") });

    await repo.addArtifactToLibrary(userId, lib.id, a1);
    await repo.addArtifactToLibrary(userId, lib.id, a2);

    const list = await repo.listArtifactsForLibrary(userId, lib.id);
    expect(list[0].id).toBe(a2.id);
    expect(list[1].id).toBe(a1.id);
  });

  it("enforces unique sha256Hash within a library (catches race)", async () => {
    const userId = "00000000-0000-4000-8000-000000000003";
    const lib = await repo.ensureDefaultForUser(userId, "My Library");
    const hash = "aabb".repeat(8);

    const a1 = makeArtifact({ libraryId: lib.id, sourceFile: { ...makeArtifact().sourceFile, sha256Hash: hash } });
    const a2 = makeArtifact({ libraryId: lib.id, sourceFile: { ...makeArtifact().sourceFile, sha256Hash: hash } });

    await repo.addArtifactToLibrary(userId, lib.id, a1);
    await expect(repo.addArtifactToLibrary(userId, lib.id, a2)).rejects.toMatchObject({ code: 11000 });
  });
});
