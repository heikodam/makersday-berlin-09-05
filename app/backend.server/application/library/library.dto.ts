import type { Artifact } from "@backend-domain/library/artifact";
import type { Library } from "@backend-domain/library/library";

export interface ArtifactDto {
  id: string;
  libraryId: string;
  title: string;
  kind: string;
  uploadStatus: string;
  pageCount?: number;
  byteSize: number;
  sha256Hash: string;
  uploadedAt: string;
  processedAt?: string;
}

export interface LibraryDto {
  id: string;
  userId: string;
  name: string;
  isActive: boolean;
  createdAt: string;
}

export function toArtifactDto(artifact: Artifact): ArtifactDto {
  return {
    id: artifact.id,
    libraryId: artifact.libraryId,
    title: artifact.title,
    kind: artifact.kind,
    uploadStatus: artifact.uploadStatus,
    pageCount: artifact.pageCount,
    byteSize: artifact.sourceFile.byteSize,
    sha256Hash: artifact.sourceFile.sha256Hash,
    uploadedAt: artifact.uploadedAt.toISOString(),
    processedAt: artifact.processedAt?.toISOString(),
  };
}

export function toLibraryDto(library: Library): LibraryDto {
  return {
    id: library.id,
    userId: library.userId,
    name: library.name,
    isActive: library.isActive,
    createdAt: library.createdAt.toISOString(),
  };
}
