import type { ArtifactSummary } from "./DocumentGrid";

interface DocumentCardProps {
  artifact: ArtifactSummary;
  onDelete?: (id: string) => void;
}

const KIND_LABELS: Record<string, string> = {
  pdf: "PDF",
  research: "Research",
  article: "Article",
  dataset: "Dataset",
  book: "Book",
};

export function DocumentCard({ artifact, onDelete }: DocumentCardProps): React.JSX.Element {
  return (
    <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-sm flex flex-col gap-xs group relative">
      <div className="aspect-[3/4] bg-surface-container rounded-lg flex items-center justify-center text-on-surface-variant">
        <span className="material-symbols-outlined text-[40px]" aria-hidden="true">description</span>
      </div>

      <span className="text-label-caps font-label-caps text-secondary uppercase">
        {KIND_LABELS[artifact.kind] ?? artifact.kind}
      </span>

      <p className="text-body-sm font-body-sm text-on-surface m-0 line-clamp-2">{artifact.title}</p>

      <p className="text-body-sm font-body-sm text-on-surface-variant m-0 text-[12px]">
        Uploaded{" "}
        {new Date(artifact.uploadedAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
      </p>

      {onDelete ? (
        <button
          type="button"
          className="absolute top-sm right-sm hidden group-hover:flex items-center justify-center w-7 h-7 rounded-full bg-error-container text-on-error-container text-[14px] hover:bg-error hover:text-on-error transition-colors"
          aria-label={`Delete ${artifact.title}`}
          onClick={() => onDelete(artifact.id)}
        >
          <span className="material-symbols-outlined text-[16px]" aria-hidden="true">delete</span>
        </button>
      ) : null}
    </div>
  );
}
