import { z } from "zod";
import { ARTIFACT_KIND } from "@shared/domain/library/artifact-kind";
import { ARTIFACT_STATUS } from "@shared/domain/library/artifact-status";
export type { ArtifactKind } from "@shared/domain/library/artifact-kind";
export type { ArtifactStatus } from "@shared/domain/library/artifact-status";

export const sourceFileSchema = z.object({
  storageUri: z.string(),
  byteSize: z.number().int().positive(),
  mimeType: z.string(),
  sha256Hash: z.string().length(64),
});
export type SourceFile = z.infer<typeof sourceFileSchema>;

export const artifactSchema = z.object({
  id: z.string().uuid(),
  libraryId: z.string().uuid(),
  title: z.string().min(1),
  kind: z.enum(ARTIFACT_KIND),
  uploadStatus: z.enum(ARTIFACT_STATUS),
  sourceFile: sourceFileSchema,
  pageCount: z.number().int().positive().optional(),
  uploadedAt: z.date(),
  processedAt: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Artifact = z.infer<typeof artifactSchema>;

export function isReady(artifact: Artifact): boolean {
  return artifact.uploadStatus === "ready";
}
