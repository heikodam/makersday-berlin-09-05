import { z } from "zod";

export const artifactKindSchema = z.enum(["pdf", "research", "article", "dataset", "book"]);
export type ArtifactKind = z.infer<typeof artifactKindSchema>;

export const uploadStatusSchema = z.enum(["uploading", "processing", "ready", "failed", "removed"]);
export type UploadStatus = z.infer<typeof uploadStatusSchema>;

export const sourceFileSchema = z.object({
  storageUri: z.string().min(1),
  byteSize: z.number().int().positive(),
  mimeType: z.string().min(1),
  sha256Hash: z.string().min(1),
});
export type SourceFile = z.infer<typeof sourceFileSchema>;

export const artifactSchema = z
  .object({
    id: z.string().uuid(),
    libraryId: z.string().uuid(),
    title: z.string().transform((v) => v.trim()).pipe(z.string().min(1)),
    kind: artifactKindSchema,
    uploadStatus: uploadStatusSchema,
    sourceFile: sourceFileSchema,
    pageCount: z.number().int().min(1).optional(),
    uploadedAt: z.date(),
    processedAt: z.date().optional(),
    createdAt: z.date(),
    updatedAt: z.date(),
  })
  .superRefine((data, ctx) => {
    if (data.uploadStatus === "ready") {
      if (data.pageCount == null) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "pageCount required when uploadStatus is ready", path: ["pageCount"] });
      }
      if (data.processedAt == null) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "processedAt required when uploadStatus is ready", path: ["processedAt"] });
      }
    } else {
      if (data.pageCount != null) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "pageCount must be absent when uploadStatus is not ready", path: ["pageCount"] });
      }
      if (data.processedAt != null) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "processedAt must be absent when uploadStatus is not ready", path: ["processedAt"] });
      }
    }
  });

export type Artifact = z.infer<typeof artifactSchema>;
