import { useState } from "react";
import { callUploadArtifactAPI, type ArtifactDto } from "~/routes/api/api.library.artifacts._sdk";

export function useUpload(onSuccess: (artifact: ArtifactDto) => void) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setIsUploading(true);
    setError(null);
    try {
      const { artifact } = await callUploadArtifactAPI(file);
      onSuccess(artifact);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  }

  function clearError() {
    setError(null);
  }

  return { upload, isUploading, error, clearError };
}
