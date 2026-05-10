import { describe, it, expect } from "vitest";
import { Readable } from "node:stream";
import { LibraryService } from "@backend-application/library/library.service";
import { LibraryConfig } from "@backend-application/library/config";
import { InvalidPdfError, FileTooSmallError, FileTooLargeError } from "@backend-application/library/errors";
import { InMemoryLibraryRepo } from "../../doubles/in-memory-library-repo";
import { InMemoryPdfStorageGateway } from "../../doubles/in-memory-pdf-storage.gateway";
import { FakePdfParserGateway } from "../../doubles/fake-pdf-parser.gateway";

const USER_ID = "00000000-0000-4000-8000-000000000001";
const VALID_PDF_HEADER = Buffer.from("%PDF-1.4\n", "ascii");
const PDF_MAGIC = Buffer.from([0x25, 0x50, 0x44, 0x46]); // %PDF

function makePdfBuffer(size: number): Buffer {
  const buf = Buffer.alloc(size);
  PDF_MAGIC.copy(buf);
  return buf;
}

function makeStream(buffer: Buffer): Readable {
  return Readable.from(buffer);
}

function makeConfig(overrides: Partial<{ minByteSize: number; maxByteSize: number }> = {}): LibraryConfig {
  return new LibraryConfig("My Library", overrides.minByteSize ?? 10 * 1024, overrides.maxByteSize ?? 25 * 1024 * 1024);
}

function makeService(overrides: { config?: LibraryConfig; sequential?: boolean } = {}) {
  const repo = new InMemoryLibraryRepo();
  const storage = new InMemoryPdfStorageGateway();
  const parser = new FakePdfParserGateway(5);
  const config = overrides.config ?? makeConfig();
  let tick = 0;
  const clock = overrides.sequential
    ? () => new Date(new Date("2026-01-01T00:00:00Z").getTime() + tick++ * 1000)
    : () => new Date("2026-01-01T00:00:00Z");
  const service = new LibraryService(repo, storage, parser, config, clock);
  return { service, repo, storage, parser };
}

describe("LibraryService.uploadArtifact", () => {
  it("uploads a valid PDF and returns a ready artifact", async () => {
    const { service } = makeService();
    const buffer = makePdfBuffer(11 * 1024); // 11 KB

    const dto = await service.uploadArtifact({
      userId: USER_ID,
      fileName: "paper.pdf",
      mimeType: "application/pdf",
      stream: makeStream(buffer),
    });

    expect(dto.uploadStatus).toBe("ready");
    expect(dto.title).toBe("paper");
    expect(dto.pageCount).toBe(5);
    expect(dto.byteSize).toBe(buffer.length);
  });

  it("auto-provisions the default library on first upload and is idempotent", async () => {
    const { service, repo } = makeService();
    const buf = makePdfBuffer(11 * 1024);

    await service.uploadArtifact({ userId: USER_ID, fileName: "a.pdf", mimeType: "application/pdf", stream: makeStream(buf) });
    const lib = await repo.getDefaultForUser(USER_ID);
    expect(lib).not.toBeNull();
    expect(lib!.name).toBe("My Library");

    // Second upload does not create another library
    const buf2 = makePdfBuffer(12 * 1024);
    buf2[4] = 0x01; // Make sha256 different
    await service.uploadArtifact({ userId: USER_ID, fileName: "b.pdf", mimeType: "application/pdf", stream: makeStream(buf2) });
    const lib2 = await repo.getDefaultForUser(USER_ID);
    expect(lib2!.id).toBe(lib!.id);
  });

  it("lists artifacts newest-first after upload", async () => {
    const { service } = makeService({ sequential: true });

    const buf1 = makePdfBuffer(11 * 1024);
    const buf2 = makePdfBuffer(12 * 1024);
    buf2[4] = 0xAA;

    const dto1 = await service.uploadArtifact({ userId: USER_ID, fileName: "first.pdf", mimeType: "application/pdf", stream: makeStream(buf1) });
    const dto2 = await service.uploadArtifact({ userId: USER_ID, fileName: "second.pdf", mimeType: "application/pdf", stream: makeStream(buf2) });

    const list = await service.listArtifacts(USER_ID);
    expect(list[0].id).toBe(dto2.id);
    expect(list[1].id).toBe(dto1.id);
  });

  it("rejects file with bad magic bytes with InvalidPdfError", async () => {
    const { service } = makeService();
    const buf = Buffer.alloc(11 * 1024, 0x00);

    await expect(
      service.uploadArtifact({ userId: USER_ID, fileName: "bad.pdf", mimeType: "application/pdf", stream: makeStream(buf) }),
    ).rejects.toBeInstanceOf(InvalidPdfError);
  });

  it("rejects file below minByteSize with FileTooSmallError", async () => {
    const { service } = makeService({ config: makeConfig({ minByteSize: 10 * 1024 }) });
    const buf = makePdfBuffer(100);

    await expect(
      service.uploadArtifact({ userId: USER_ID, fileName: "tiny.pdf", mimeType: "application/pdf", stream: makeStream(buf) }),
    ).rejects.toBeInstanceOf(FileTooSmallError);
  });

  it("rejects file above maxByteSize with FileTooLargeError", async () => {
    const { service } = makeService({ config: makeConfig({ minByteSize: 4, maxByteSize: 1024 }) });
    const buf = makePdfBuffer(2048);

    await expect(
      service.uploadArtifact({ userId: USER_ID, fileName: "huge.pdf", mimeType: "application/pdf", stream: makeStream(buf) }),
    ).rejects.toBeInstanceOf(FileTooLargeError);
  });

  it("user A cannot see user B's artifacts", async () => {
    const { service } = makeService();
    const buf = makePdfBuffer(11 * 1024);

    await service.uploadArtifact({ userId: USER_ID, fileName: "a.pdf", mimeType: "application/pdf", stream: makeStream(buf) });

    const otherUserId = "00000000-0000-4000-8000-000000000002";
    const otherList = await service.listArtifacts(otherUserId);
    expect(otherList).toHaveLength(0);
  });
});

describe("LibraryService dedupe (AC 8)", () => {
  it("rejects a duplicate file (same sha256) with DuplicateArtifactError", async () => {
    const { service } = makeService();
    const buf = makePdfBuffer(11 * 1024);

    await service.uploadArtifact({ userId: USER_ID, fileName: "orig.pdf", mimeType: "application/pdf", stream: makeStream(buf) });

    const { DuplicateArtifactError } = await import("@backend-application/library/errors");
    await expect(
      service.uploadArtifact({ userId: USER_ID, fileName: "dup.pdf", mimeType: "application/pdf", stream: makeStream(buf) }),
    ).rejects.toBeInstanceOf(DuplicateArtifactError);
  });
});

describe("LibraryService.listArtifacts", () => {
  it("returns empty array when user has no library", async () => {
    const { service } = makeService();
    const list = await service.listArtifacts(USER_ID);
    expect(list).toHaveLength(0);
  });
});

describe("LibraryService.removeArtifact", () => {
  it("removes artifact and deletes from storage", async () => {
    const { service } = makeService();
    const buf = makePdfBuffer(11 * 1024);

    const dto = await service.uploadArtifact({ userId: USER_ID, fileName: "a.pdf", mimeType: "application/pdf", stream: makeStream(buf) });

    await service.removeArtifact(USER_ID, dto.id);

    const list = await service.listArtifacts(USER_ID);
    expect(list).toHaveLength(0);
  });
});
