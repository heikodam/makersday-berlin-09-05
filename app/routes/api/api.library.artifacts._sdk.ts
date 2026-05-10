import { z } from "zod";

const artifactDtoSchema = z.object({
  id: z.string(),
  libraryId: z.string(),
  title: z.string(),
  kind: z.string(),
  uploadStatus: z.string(),
  pageCount: z.number().optional(),
  byteSize: z.number(),
  sha256Hash: z.string(),
  uploadedAt: z.string(),
  processedAt: z.string().optional(),
});

const listResponseSchema = z.object({
  artifacts: z.array(artifactDtoSchema),
});

const uploadErrorSchema = z.object({ error: z.string() });

export type ArtifactDto = z.infer<typeof artifactDtoSchema>;

export async function callListArtifactsApi(): Promise<ArtifactDto[]> {
  const res = await fetch("/api/library/artifacts");
  if (!res.ok) throw new Error(`List artifacts failed: ${res.status}`);
  const json = await res.json();
  return listResponseSchema.parse(json).artifacts;
}

export async function callUploadArtifactApi(file: File): Promise<ArtifactDto> {
  const body = new FormData();
  body.append("file", file);
  const res = await fetch("/api/library/artifacts/upload", {
    method: "POST",
    body,
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({ error: "Upload failed" }));
    throw Object.assign(new Error(uploadErrorSchema.parse(json).error), { status: res.status });
  }
  return artifactDtoSchema.parse(await res.json());
}

export async function callDeleteArtifactApi(artifactId: string): Promise<void> {
  const res = await fetch(`/api/library/artifacts/${artifactId}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`Delete artifact failed: ${res.status}`);
}

export function getArtifactDownloadUrl(artifactId: string): string {
  return `/api/library/artifacts/${artifactId}`;
}
