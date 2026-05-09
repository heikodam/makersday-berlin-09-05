import { useRef, useState } from "react";
import { useUpload } from "./hooks/use-upload";
import type { ArtifactDto } from "~/routes/api/api.library.artifacts._sdk";

interface UploadZoneProps {
  onUploadSuccess: (artifact: ArtifactDto) => void;
}

export function UploadZone({ onUploadSuccess }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { upload, isUploading, error, clearError } = useUpload(onUploadSuccess);

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) void upload(file);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void upload(file);
    e.target.value = "";
  }

  return (
    <div className="w-full">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={[
          "flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-8 py-12 transition-colors",
          isDragging ? "border-primary bg-surface-container" : "border-outline",
          isUploading ? "pointer-events-none opacity-60" : "cursor-pointer",
        ].join(" ")}
        onClick={() => !isUploading && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && !isUploading && inputRef.current?.click()}
        aria-label="Upload PDF"
      >
        {isUploading ? (
          <>
            <span className="material-symbols-outlined animate-spin text-4xl text-secondary">progress_activity</span>
            <p className="text-body-md text-on-surface-variant">Uploading…</p>
          </>
        ) : (
          <>
            <span className="material-symbols-outlined text-5xl text-outline">upload_file</span>
            <div className="text-center">
              <p className="text-body-md font-semibold text-on-surface">Drag & Drop PDF here</p>
              <p className="text-body-sm text-on-surface-variant">or</p>
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
              className="rounded-lg bg-primary px-5 py-2 text-body-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              Browse Files
            </button>
            <p className="text-body-sm text-on-surface-variant">PDF only · max 25 MB</p>
          </>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleChange}
      />

      {error && (
        <div className="mt-3 flex items-center justify-between rounded-lg border border-error bg-error-container px-4 py-3">
          <p className="text-body-sm text-on-error-container">{error}</p>
          <button type="button" onClick={clearError} aria-label="Dismiss error">
            <span className="material-symbols-outlined text-base text-on-error-container">close</span>
          </button>
        </div>
      )}
    </div>
  );
}
