import type { Library } from "./library";
import type { Artifact, UploadStatus } from "./artifact";

export interface LibraryRepo {
  getDefaultForUser(userId: string): Promise<Library | null>;
  ensureDefaultForUser(userId: string, defaultName: string): Promise<Library>;
  addArtifactToLibrary(userId: string, libraryId: string, artifact: Artifact): Promise<Artifact>;
  getArtifactById(userId: string, libraryId: string, artifactId: string): Promise<Artifact | null>;
  listArtifactsForLibrary(userId: string, libraryId: string): Promise<Artifact[]>;
  findArtifactByHash(userId: string, libraryId: string, sha256Hash: string): Promise<Artifact | null>;
  updateArtifactStatus(
    userId: string,
    libraryId: string,
    artifactId: string,
    nextStatus: UploadStatus,
    extra?: { pageCount?: number; processedAt?: Date },
  ): Promise<Artifact>;
  removeArtifact(userId: string, libraryId: string, artifactId: string): Promise<void>;
}
