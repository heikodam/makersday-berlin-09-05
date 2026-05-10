import { createHash } from "node:crypto";
import type { Readable } from "node:stream";
import { v4 as uuidv4 } from "uuid";
import type { LibraryRepo } from "@backend-domain/library/library.repo";
import type { PdfStorageGateway } from "./pdf-storage.gateway";
import type { PdfParserGateway } from "./pdf-parser.gateway";
import type { LibraryConfig } from "./config";
import { InvalidPdfError, PdfParseError, FileTooSmallError, FileTooLargeError, DuplicateArtifactError } from "./errors";
import type { ArtifactDto } from "./library.dto";
import { toArtifactDto } from "./library.dto";

const PDF_MAGIC = Buffer.from([0x25, 0x50, 0x44, 0x46]); // %PDF

interface UploadInput {
  userId: string;
  fileName: string;
  mimeType: string;
  stream: Readable;
}

export class LibraryService {
  constructor(
    private readonly repo: LibraryRepo,
    private readonly pdfStorage: PdfStorageGateway,
    private readonly pdfParser: PdfParserGateway,
    private readonly config: LibraryConfig,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async uploadArtifact(input: UploadInput): Promise<ArtifactDto> {
    const { userId, fileName, mimeType, stream } = input;

    const buffer = await this._drainStream(stream);

    // Magic-byte check first
    if (buffer.length < 4 || !buffer.subarray(0, 4).equals(PDF_MAGIC)) {
      throw new InvalidPdfError();
    }

    if (buffer.length < this.config.minByteSize) {
      throw new FileTooSmallError();
    }

    if (buffer.length > this.config.maxByteSize) {
      throw new FileTooLargeError();
    }

    const sha256Hash = createHash("sha256").update(buffer).digest("hex");
    const library = await this.repo.ensureDefaultForUser(userId, this.config.defaultLibraryName);

    // Short-circuit dedupe check before writing to storage
    const existing = await this.repo.findArtifactByHash(userId, library.id, sha256Hash);
    if (existing) throw new DuplicateArtifactError();

    const now = this.clock();
    const artifactId = uuidv4();
    const title = fileName.replace(/\.pdf$/i, "");

    const { storageUri } = await this.pdfStorage.putPdf(buffer);

    let artifact;
    try {
      artifact = await this.repo.addArtifactToLibrary(userId, library.id, {
        id: artifactId,
        libraryId: library.id,
        title,
        kind: "pdf",
        uploadStatus: "processing",
        sourceFile: { storageUri, byteSize: buffer.length, mimeType, sha256Hash },
        uploadedAt: now,
        createdAt: now,
        updatedAt: now,
      });
    } catch (err) {
      // Race-condition: unique index violation after short-circuit check passed
      if (typeof err === "object" && err !== null && "code" in err && (err as { code: unknown }).code === 11000) {
        await this.pdfStorage.deletePdf(storageUri).catch(() => undefined);
        throw new DuplicateArtifactError();
      }
      throw err;
    }

    let pageCount: number;
    try {
      const parsed = await this.pdfParser.parsePdf(buffer);
      pageCount = parsed.pageCount;
    } catch (err) {
      await this.pdfStorage.deletePdf(storageUri).catch(() => undefined);
      await this.repo.updateArtifactStatus(userId, library.id, artifact.id, "failed");
      throw new PdfParseError(err);
    }

    const ready = await this.repo.updateArtifactStatus(userId, library.id, artifact.id, "ready", {
      pageCount,
      processedAt: this.clock(),
    });

    return toArtifactDto(ready);
  }

  async listArtifacts(userId: string): Promise<ArtifactDto[]> {
    const library = await this.repo.getDefaultForUser(userId);
    if (!library) return [];
    const artifacts = await this.repo.listArtifactsForLibrary(userId, library.id);
    return artifacts.map(toArtifactDto);
  }

  async removeArtifact(userId: string, artifactId: string): Promise<void> {
    const library = await this.repo.getDefaultForUser(userId);
    if (!library) return;
    const artifact = await this.repo.getArtifactById(userId, library.id, artifactId);
    if (!artifact) return;
    await this.repo.updateArtifactStatus(userId, library.id, artifactId, "removed");
    await this.pdfStorage.deletePdf(artifact.sourceFile.storageUri);
  }

  private async _drainStream(stream: Readable): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string));
    }
    return Buffer.concat(chunks);
  }
}
