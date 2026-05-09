import { describe, it, expect, vi, beforeEach } from "vitest";
import { LibraryService } from "../../../../app/backend.server/application/library/library.service";
import { LibraryConfig } from "../../../../app/backend.server/application/library/config";
import {
  DuplicateArtifactError,
  FileTooLargeError,
  FileTooSmallError,
  InvalidFileTypeError,
} from "../../../../app/backend.server/application/library/errors";
import type { LibraryRepo } from "../../../../app/backend.server/domain/library/library.repo";
import type { PdfParser } from "../../../../app/backend.server/application/library/pdf-parser";
import type { Library } from "../../../../app/backend.server/domain/library/library";
import type { Artifact } from "../../../../app/backend.server/domain/library/artifact";

const VALID_PDF_HEADER = Buffer.from("%PDF-1.4\n");
const MIN_SIZE = 10_240;

function makePdfBuffer(size = MIN_SIZE + 100): Buffer {
  const buf = Buffer.alloc(size, 0);
  VALID_PDF_HEADER.copy(buf);
  return buf;
}

const defaultLibrary: Library = {
  id: "lib-001",
  userId: "user-001",
  name: "My Library",
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const defaultArtifact: Artifact = {
  id: "art-001",
  libraryId: "lib-001",
  title: "test",
  kind: "pdf",
  uploadStatus: "processing",
  sourceFile: { storageUri: "gridfs://abc", byteSize: MIN_SIZE + 100, mimeType: "application/pdf", sha256Hash: "a".repeat(64) },
  uploadedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeFakeRepo(overrides: Partial<LibraryRepo> = {}): LibraryRepo {
  return {
    findOrCreateDefaultLibrary: vi.fn().mockResolvedValue(defaultLibrary),
    addArtifactToLibrary: vi.fn().mockResolvedValue(defaultArtifact),
    getArtifactById: vi.fn().mockResolvedValue(defaultArtifact),
    listArtifactsForLibrary: vi.fn().mockResolvedValue([]),
    findArtifactByHash: vi.fn().mockResolvedValue(null),
    updateArtifactStatus: vi.fn().mockImplementation((_u, _l, _id, status) =>
      Promise.resolve({ ...defaultArtifact, uploadStatus: status }),
    ),
    storeFile: vi.fn().mockResolvedValue("gridfs://abc"),
    readFile: vi.fn().mockResolvedValue(Buffer.from("data")),
    deleteFile: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function makeFakePdfParser(pageCount = 5): PdfParser {
  return { getPageCount: vi.fn().mockResolvedValue(pageCount) };
}

function makeService(repo: LibraryRepo, parser: PdfParser) {
  return new LibraryService(new LibraryConfig(26_214_400), repo, parser);
}

describe("LibraryService.uploadArtifact", () => {
  it("rejects files smaller than 10 KB", async () => {
    const service = makeService(makeFakeRepo(), makeFakePdfParser());
    const small = makePdfBuffer(100);
    await expect(service.uploadArtifact("user-001", small, "file.pdf")).rejects.toBeInstanceOf(FileTooSmallError);
  });

  it("rejects files larger than maxUploadBytes", async () => {
    const service = makeService(makeFakeRepo(), makeFakePdfParser());
    const large = makePdfBuffer(26_214_401);
    await expect(service.uploadArtifact("user-001", large, "file.pdf")).rejects.toBeInstanceOf(FileTooLargeError);
  });

  it("rejects buffers without %PDF- magic bytes", async () => {
    const service = makeService(makeFakeRepo(), makeFakePdfParser());
    const notPdf = Buffer.alloc(MIN_SIZE + 100, 0x41);
    await expect(service.uploadArtifact("user-001", notPdf, "file.pdf")).rejects.toBeInstanceOf(InvalidFileTypeError);
  });

  it("rejects SHA-256 duplicates within the same library", async () => {
    const repo = makeFakeRepo({ findArtifactByHash: vi.fn().mockResolvedValue(defaultArtifact) });
    const service = makeService(repo, makeFakePdfParser());
    await expect(service.uploadArtifact("user-001", makePdfBuffer(), "file.pdf")).rejects.toBeInstanceOf(DuplicateArtifactError);
  });

  it("happy path: stores file, saves artifact with ready status, returns DTO", async () => {
    const readyArtifact = { ...defaultArtifact, uploadStatus: "ready" as const, pageCount: 5 };
    const repo = makeFakeRepo({
      updateArtifactStatus: vi.fn().mockResolvedValue(readyArtifact),
    });
    const service = makeService(repo, makeFakePdfParser(5));

    const dto = await service.uploadArtifact("user-001", makePdfBuffer(), "my-doc.pdf");

    expect(repo.storeFile).toHaveBeenCalledOnce();
    expect(repo.addArtifactToLibrary).toHaveBeenCalledOnce();
    expect(repo.updateArtifactStatus).toHaveBeenCalledWith("user-001", "lib-001", expect.any(String), "ready", {
      pageCount: 5,
      processedAt: expect.any(Date),
    });
    expect(dto.uploadStatus).toBe("ready");
    expect(dto.title).toBe("my-doc");
  });

  it("on pdf-parse failure: deletes file, sets status to failed, re-throws InvalidFileTypeError", async () => {
    const repo = makeFakeRepo();
    const parser: PdfParser = { getPageCount: vi.fn().mockRejectedValue(new Error("bad pdf")) };
    const service = makeService(repo, parser);

    await expect(service.uploadArtifact("user-001", makePdfBuffer(), "bad.pdf")).rejects.toBeInstanceOf(InvalidFileTypeError);

    expect(repo.deleteFile).toHaveBeenCalledWith("gridfs://abc");
    expect(repo.updateArtifactStatus).toHaveBeenCalledWith("user-001", "lib-001", expect.any(String), "failed");
  });
});

describe("LibraryService.listArtifacts", () => {
  it("returns DTOs for all non-removed artifacts, newest first", async () => {
    const arts: Artifact[] = [
      { ...defaultArtifact, id: "a1", uploadStatus: "ready", uploadedAt: new Date("2024-01-02") },
      { ...defaultArtifact, id: "a2", uploadStatus: "ready", uploadedAt: new Date("2024-01-01") },
    ];
    const repo = makeFakeRepo({ listArtifactsForLibrary: vi.fn().mockResolvedValue(arts) });
    const service = makeService(repo, makeFakePdfParser());

    const dtos = await service.listArtifacts("user-001");

    expect(dtos).toHaveLength(2);
    expect(dtos[0].id).toBe("a1");
    expect(dtos[1].id).toBe("a2");
  });
});
