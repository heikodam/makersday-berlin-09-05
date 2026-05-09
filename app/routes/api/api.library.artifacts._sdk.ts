import { z } from "zod";
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

const artifactDtoSchema = z.object({
  id: z.string(),
  libraryId: z.string(),
  title: z.string(),
  kind: z.string(),
  uploadStatus: z.string(),
  pageCount: z.number().optional(),
  byteSize: z.number(),
  uploadedAt: z.string(),
  processedAt: z.string().optional(),
});

export interface UploadArtifactResult {
  artifact: ArtifactDto;
}

export async function callUploadArtifactAPI(file: File): Promise<UploadArtifactResult> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/library/artifacts/upload", { method: "POST", body: form });
  const json: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = (json as { error?: string }).error ?? `Upload failed (${res.status})`;
    throw new Error(error);
  }
  const parsed = z.object({ artifact: artifactDtoSchema }).parse(json);
  return parsed as UploadArtifactResult;
}

export async function callListArtifactsAPI(): Promise<ArtifactDto[]> {
  const res = await fetch("/api/library/artifacts", { method: "GET" });
  if (!res.ok) throw new Error(`Failed to list artifacts (${res.status})`);
  const json: unknown = await res.json().catch(() => ({}));
  const parsed = z.object({ artifacts: z.array(artifactDtoSchema) }).parse(json);
  return parsed.artifacts as ArtifactDto[];
}

export async function callDeleteArtifactAPI(artifactId: string): Promise<void> {
  const res = await fetch(`/api/library/artifacts/${encodeURIComponent(artifactId)}`, { method: "DELETE" });
  if (!res.ok) {
    const json: unknown = await res.json().catch(() => ({}));
    const error = (json as { error?: string }).error ?? `Delete failed (${res.status})`;
    throw new Error(error);
  }
}
