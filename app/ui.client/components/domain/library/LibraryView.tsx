import { useState } from "react";
import { UploadZone } from "./UploadZone";
import { DocumentCard } from "./DocumentCard";
import type { ArtifactDto } from "~/routes/api/api.library.artifacts._sdk";

interface LibraryViewProps {
  initialArtifacts: ArtifactDto[];
}

export function LibraryView({ initialArtifacts }: LibraryViewProps) {
  const [artifacts, setArtifacts] = useState<ArtifactDto[]>(initialArtifacts);

  function handleUploadSuccess(artifact: ArtifactDto) {
    setArtifacts((prev) => [artifact, ...prev]);
  }

  function handleDelete(artifactId: string) {
    setArtifacts((prev) => prev.filter((a) => a.id !== artifactId));
  }

  return (
    <div className="flex min-h-screen bg-surface">
      {/* Sidebar */}
      <aside className="hidden w-[280px] shrink-0 flex-col border-r border-outline-variant bg-surface-container-lowest md:flex">
        <div className="flex h-16 items-center border-b border-outline-variant px-6">
          <span className="text-title-sm font-semibold text-primary">Scholastic AI</span>
        </div>
        <nav className="flex flex-col gap-1 p-4">
          <NavItem icon="menu_book" label="Library" active />
          <NavItem icon="chat" label="Chat" disabled />
          <NavItem icon="history" label="History" disabled />
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-outline-variant bg-surface-container-lowest px-6">
          <div className="flex items-center gap-2 rounded-lg border border-outline-variant bg-surface-container px-3 py-2 text-on-surface-variant opacity-60">
            <span className="material-symbols-outlined text-base">search</span>
            <span className="text-body-sm">Search documents…</span>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" aria-label="Notifications" className="rounded-full p-2 hover:bg-surface-container">
              <span className="material-symbols-outlined text-xl text-on-surface-variant">notifications</span>
            </button>
            <button type="button" aria-label="Settings" className="rounded-full p-2 hover:bg-surface-container">
              <span className="material-symbols-outlined text-xl text-on-surface-variant">settings</span>
            </button>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-body-sm font-semibold text-white">
              U
            </div>
          </div>
        </header>

        {/* Page body */}
        <main className="flex-1 overflow-y-auto px-6 py-8">
          <div className="mx-auto max-w-5xl space-y-8">
            <UploadZone onUploadSuccess={handleUploadSuccess} />

            <section>
              <h2 className="mb-4 text-title-sm font-semibold text-on-surface">
                Recent Documents
                {artifacts.length > 0 && (
                  <span className="ml-2 text-body-sm font-normal text-on-surface-variant">({artifacts.length})</span>
                )}
              </h2>

              {artifacts.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-16 text-center text-on-surface-variant">
                  <span className="material-symbols-outlined text-5xl">folder_open</span>
                  <p className="text-body-md">No documents yet. Upload a PDF to get started.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {artifacts.map((artifact) => (
                    <DocumentCard key={artifact.id} artifact={artifact} onDelete={handleDelete} />
                  ))}
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

interface NavItemProps {
  icon: string;
  label: string;
  active?: boolean;
  disabled?: boolean;
}

function NavItem({ icon, label, active, disabled }: NavItemProps) {
  return (
    <div
      aria-disabled={disabled}
      className={[
        "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-body-sm font-semibold transition-colors",
        active
          ? "bg-secondary-container text-on-secondary-container"
          : disabled
            ? "cursor-not-allowed text-on-surface-variant opacity-40"
            : "text-on-surface hover:bg-surface-container",
      ].join(" ")}
    >
      <span className="material-symbols-outlined text-xl">{icon}</span>
      {label}
    </div>
  );
}
