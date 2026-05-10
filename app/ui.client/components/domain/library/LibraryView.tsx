import { useState } from "react";
import { useRevalidator } from "react-router";
import { Sidebar } from "./Sidebar";
import { TopAppBar } from "./TopAppBar";
import { UploadDropzone } from "./UploadDropzone";
import { DocumentGrid, type ArtifactSummary } from "./DocumentGrid";
import { callUploadArtifactApi, callDeleteArtifactApi } from "~/routes/api/api.library.artifacts._sdk";

interface LibraryViewProps {
  artifacts: ArtifactSummary[];
}

export function LibraryView({ artifacts }: LibraryViewProps): React.JSX.Element {
  const revalidator = useRevalidator();
  const [isUploading, setIsUploading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  async function handleFileSelected(file: File): Promise<void> {
    setIsUploading(true);
    setToast(null);
    try {
      await callUploadArtifactApi(file);
      revalidator.revalidate();
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDelete(artifactId: string): Promise<void> {
    try {
      await callDeleteArtifactApi(artifactId);
      revalidator.revalidate();
    } catch {
      setToast("Could not delete document");
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <div className="flex flex-col flex-1 min-w-0">
        <TopAppBar />

        <main className="flex-1 p-md flex flex-col gap-lg overflow-auto">
          {toast ? (
            <div
              role="alert"
              className="bg-error-container text-on-error-container text-body-sm font-body-sm rounded-lg px-md py-sm flex items-center justify-between"
            >
              {toast}
              <button
                type="button"
                className="text-on-error-container opacity-60 hover:opacity-100"
                onClick={() => setToast(null)}
                aria-label="Dismiss"
              >
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">close</span>
              </button>
            </div>
          ) : null}

          <UploadDropzone onFileSelected={handleFileSelected} isUploading={isUploading} />
          <DocumentGrid artifacts={artifacts} onDelete={handleDelete} />
        </main>
      </div>
    </div>
  );
}
