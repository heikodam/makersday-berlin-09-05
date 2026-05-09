import { useState } from "react";
import { callDeleteArtifactAPI, type ArtifactDto } from "~/routes/api/api.library.artifacts._sdk";

interface DocumentCardProps {
  artifact: ArtifactDto;
  onDelete: (artifactId: string) => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function DocumentCard({ artifact, onDelete }: DocumentCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    setMenuOpen(false);
    setIsDeleting(true);
    try {
      await callDeleteArtifactAPI(artifact.id);
      onDelete(artifact.id);
    } catch {
      setIsDeleting(false);
    }
  }

  return (
    <div
      className={[
        "relative flex flex-col gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-4 transition-colors hover:border-secondary",
        isDeleting ? "pointer-events-none opacity-50" : "",
      ].join(" ")}
    >
      <div className="flex h-36 items-center justify-center rounded-lg bg-surface-container">
        <span className="material-symbols-outlined text-6xl text-outline">picture_as_pdf</span>
      </div>

      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-body-sm font-semibold text-on-surface">{artifact.title}</p>
          <div className="mt-1 flex items-center gap-2">
            <span className="rounded-sm px-1.5 py-0.5 text-label-caps" style={{ backgroundColor: "#9BF3D4", color: "#001f24" }}>
              PDF
            </span>
            {artifact.pageCount && (
              <span className="text-label-caps text-on-surface-variant">{artifact.pageCount}p</span>
            )}
          </div>
          <p className="mt-1 text-body-sm text-on-surface-variant">{formatDate(artifact.uploadedAt)}</p>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="More options"
            className="rounded-full p-1 hover:bg-surface-container"
          >
            <span className="material-symbols-outlined text-base text-on-surface-variant">more_vert</span>
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-8 z-20 min-w-[140px] rounded-lg border border-outline-variant bg-surface-container-lowest py-1 shadow-lg">
                <button
                  type="button"
                  onClick={handleDelete}
                  className="flex w-full items-center gap-2 px-3 py-2 text-body-sm text-error hover:bg-error-container"
                >
                  <span className="material-symbols-outlined text-base">delete</span>
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
