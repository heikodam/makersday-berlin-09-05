import { v4 as uuidv4 } from "uuid";
import type { Library } from "@backend-domain/library/library";
import type { Artifact, UploadStatus } from "@backend-domain/library/artifact";
import type { LibraryRepo } from "@backend-domain/library/library.repo";

export class InMemoryLibraryRepo implements LibraryRepo {
  private readonly libraries = new Map<string, Library>();
  private readonly artifacts = new Map<string, Artifact>();

  async getDefaultForUser(userId: string): Promise<Library | null> {
    for (const lib of this.libraries.values()) {
      if (lib.userId === userId && lib.isActive) return lib;
    }
    return null;
  }

  async ensureDefaultForUser(userId: string, defaultName: string): Promise<Library> {
    const existing = await this.getDefaultForUser(userId);
    if (existing) return existing;
    const now = new Date();
    const lib: Library = { id: uuidv4(), userId, name: defaultName, isActive: true, createdAt: now, updatedAt: now };
    this.libraries.set(lib.id, lib);
    return lib;
  }

  async addArtifactToLibrary(_userId: string, _libraryId: string, artifact: Artifact): Promise<Artifact> {
    this.artifacts.set(artifact.id, artifact);
    return artifact;
  }

  async getArtifactById(_userId: string, _libraryId: string, artifactId: string): Promise<Artifact | null> {
    return this.artifacts.get(artifactId) ?? null;
  }

  async listArtifactsForLibrary(_userId: string, libraryId: string): Promise<Artifact[]> {
    const result = [...this.artifacts.values()]
      .filter((a) => a.libraryId === libraryId && a.uploadStatus !== "removed")
      .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
    return result;
  }

  async findArtifactByHash(_userId: string, libraryId: string, sha256Hash: string): Promise<Artifact | null> {
    for (const a of this.artifacts.values()) {
      if (a.libraryId === libraryId && a.sourceFile.sha256Hash === sha256Hash) return a;
    }
    return null;
  }

  async updateArtifactStatus(
    _userId: string,
    _libraryId: string,
    artifactId: string,
    nextStatus: UploadStatus,
    extra?: { pageCount?: number; processedAt?: Date },
  ): Promise<Artifact> {
    const artifact = this.artifacts.get(artifactId);
    if (!artifact) throw new Error(`Artifact ${artifactId} not found`);
    const updated: Artifact = {
      ...artifact,
      uploadStatus: nextStatus,
      pageCount: extra?.pageCount,
      processedAt: extra?.processedAt,
      updatedAt: new Date(),
    };
    this.artifacts.set(artifactId, updated);
    return updated;
  }

  async removeArtifact(_userId: string, _libraryId: string, artifactId: string): Promise<void> {
    await this.updateArtifactStatus(_userId, _libraryId, artifactId, "removed");
  }
}
