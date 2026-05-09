export const ARTIFACT_KIND = ["pdf", "research", "article", "dataset", "book"] as const;
export type ArtifactKind = (typeof ARTIFACT_KIND)[number];
