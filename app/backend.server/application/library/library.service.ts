import { createHash } from "node:crypto";
import type { LibraryRepo } from "@backend-domain/library/library.repo";
import type { Artifact } from "@backend-domain/library/artifact";
import type { LibraryConfig } from "./config";
import type { PdfParser } from "./pdf-parser";
import { type ArtifactDto, toArtifactDto } from "./library.dto";
import {
  ArtifactNotFoundError,
  DuplicateArtifactError,
  FileTooLargeError,
  FileTooSmallError,
  InvalidFileTypeError,
} from "./errors";

const MIN_UPLOAD_BYTES = 10_240;
const PDF_MAGIC = Buffer.from("%PDF-");

function isPdf(buffer: Buffer): boolean {
  return buffer.subarray(0, 5).equals(PDF_MAGIC);
}

function titleFromFilename(filename: string): string {
  return filename.replace(/\.pdf$/i, "").trim() || filename;
}

export class LibraryService {
  constructor(
    private readonly config: LibraryConfig,
    private readonly repo: LibraryRepo,
    private readonly pdfParser: PdfParser,
  ) {}

  async uploadArtifact(userId: string, buffer: Buffer, filename: string): Promise<ArtifactDto> {
    const byteSize = buffer.length;

    if (byteSize < MIN_UPLOAD_BYTES) throw new FileTooSmallError();
    if (byteSize > this.config.maxUploadBytes) throw new FileTooLargeError();
    if (!isPdf(buffer)) throw new InvalidFileTypeError();

    const sha256Hash = createHash("sha256").update(buffer).digest("hex");
    const library = await this.repo.findOrCreateDefaultLibrary(userId);

    const existing = await this.repo.findArtifactByHash(userId, library.id, sha256Hash);
    if (existing) throw new DuplicateArtifactError();

    const storageUri = await this.repo.storeFile(buffer, filename, "application/pdf");

    const now = new Date();
    const artifact: Artifact = {
      id: crypto.randomUUID(),
      libraryId: library.id,
      title: titleFromFilename(filename),
      kind: "pdf",
      uploadStatus: "processing",
      sourceFile: {
        storageUri,
        byteSize,
        mimeType: "application/pdf",
        sha256Hash,
      },
      uploadedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    const saved = await this.repo.addArtifactToLibrary(userId, library.id, artifact);

    try {
      const pageCount = await this.pdfParser.getPageCount(buffer);
      const processedAt = new Date();
      await this.repo.updateArtifactStatus(userId, library.id, saved.id, "ready", { pageCount, processedAt });
      return toArtifactDto({ ...artifact, uploadStatus: "ready", pageCount, processedAt });
    } catch {
      await this.repo.deleteFile(storageUri);
      await this.repo.updateArtifactStatus(userId, library.id, saved.id, "failed");
      throw new InvalidFileTypeError("Could not parse PDF content");
    }
  }

  async listArtifacts(userId: string): Promise<ArtifactDto[]> {
    const library = await this.repo.findOrCreateDefaultLibrary(userId);
    const artifacts = await this.repo.listArtifactsForLibrary(userId, library.id);
    return artifacts.map(toArtifactDto);
  }

  async getArtifactFile(
    userId: string,
    artifactId: string,
  ): Promise<{ buffer: Buffer; mimeType: string; filename: string }> {
    const library = await this.repo.findOrCreateDefaultLibrary(userId);
    const artifact = await this.repo.getArtifactById(userId, library.id, artifactId);
    if (!artifact) throw new ArtifactNotFoundError();

    const buffer = await this.repo.readFile(artifact.sourceFile.storageUri);
    return { buffer, mimeType: "application/pdf", filename: artifact.title };
  }

  async deleteArtifact(userId: string, artifactId: string): Promise<void> {
    const library = await this.repo.findOrCreateDefaultLibrary(userId);
    const artifact = await this.repo.getArtifactById(userId, library.id, artifactId);
    if (!artifact) throw new ArtifactNotFoundError();

    await this.repo.deleteFile(artifact.sourceFile.storageUri);
    await this.repo.updateArtifactStatus(userId, library.id, artifactId, "removed");
  }
}
