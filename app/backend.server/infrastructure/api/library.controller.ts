import type { LibraryService } from "@backend-application/library/library.service";
import type { ArtifactDto } from "@backend-application/library/library.dto";

export class LibraryController {
  constructor(private readonly libraryService: LibraryService) {}

  async upload(userId: string, buffer: Buffer, filename: string): Promise<ArtifactDto> {
    return this.libraryService.uploadArtifact(userId, buffer, filename);
  }

  async listArtifacts(userId: string): Promise<ArtifactDto[]> {
    return this.libraryService.listArtifacts(userId);
  }

  async getArtifactFile(
    userId: string,
    artifactId: string,
  ): Promise<{ buffer: Buffer; mimeType: string; filename: string }> {
    return this.libraryService.getArtifactFile(userId, artifactId);
  }

  async deleteArtifact(userId: string, artifactId: string): Promise<void> {
    return this.libraryService.deleteArtifact(userId, artifactId);
  }
}
