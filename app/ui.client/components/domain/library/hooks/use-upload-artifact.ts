import { useRef, useState } from "react";

export interface UploadState {
  isUploading: boolean;
  error: string | null;
}

export function useUploadArtifact(onSuccess?: () => void) {
  const [state, setState] = useState<UploadState>({ isUploading: false, error: null });
  const inputRef = useRef<HTMLInputElement>(null);

  async function upload(file: File): Promise<void> {
    setState({ isUploading: true, error: null });
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/library/artifacts/upload", { method: "POST", body });
      if (!res.ok) {
        const json = await res.json().catch(() => ({ error: "Upload failed" }));
        setState({ isUploading: false, error: (json as { error?: string }).error ?? "Upload failed" });
        return;
      }
      setState({ isUploading: false, error: null });
      onSuccess?.();
    } catch {
      setState({ isUploading: false, error: "Upload failed" });
    }
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0];
    if (file) void upload(file);
    if (inputRef.current) inputRef.current.value = "";
  }

  function clearError(): void {
    setState((s) => ({ ...s, error: null }));
  }

  return { ...state, inputRef, handleFileInput, upload, clearError };
}
