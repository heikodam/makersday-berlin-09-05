import type { Library } from "./library";
import type { Artifact, ArtifactStatus } from "./artifact";

export interface LibraryRepo {
  findOrCreateDefaultLibrary(userId: string): Promise<Library>;

  addArtifactToLibrary(userId: string, libraryId: string, artifact: Artifact): Promise<Artifact>;
  getArtifactById(userId: string, libraryId: string, artifactId: string): Promise<Artifact | null>;
  listArtifactsForLibrary(userId: string, libraryId: string): Promise<Artifact[]>;
  findArtifactByHash(userId: string, libraryId: string, sha256Hash: string): Promise<Artifact | null>;
  updateArtifactStatus(
    userId: string,
    libraryId: string,
    artifactId: string,
    status: ArtifactStatus,
    opts?: { pageCount?: number; processedAt?: Date },
  ): Promise<Artifact>;

  storeFile(buffer: Buffer, filename: string, mimeType: string): Promise<string>;
  readFile(storageUri: string): Promise<Buffer>;
  deleteFile(storageUri: string): Promise<void>;
}
