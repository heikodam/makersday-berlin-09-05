import type { Artifact } from "@backend-domain/library/artifact";
import type { ArtifactKind } from "@shared/domain/library/artifact-kind";
import type { ArtifactStatus } from "@shared/domain/library/artifact-status";

export interface ArtifactDto {
  id: string;
  libraryId: string;
  title: string;
  kind: ArtifactKind;
  uploadStatus: ArtifactStatus;
  pageCount?: number;
  byteSize: number;
  uploadedAt: string;
  processedAt?: string;
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
    uploadedAt: artifact.uploadedAt.toISOString(),
    processedAt: artifact.processedAt?.toISOString(),
  };
}
