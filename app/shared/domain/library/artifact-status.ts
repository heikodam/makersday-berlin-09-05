export const ARTIFACT_STATUS = ["uploading", "processing", "ready", "failed", "removed"] as const;
export type ArtifactStatus = (typeof ARTIFACT_STATUS)[number];
