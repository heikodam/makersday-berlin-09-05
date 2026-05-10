import { DocumentCard } from "./DocumentCard";

export interface ArtifactSummary {
  id: string;
  title: string;
  kind: string;
  uploadedAt: string;
}

interface DocumentGridProps {
  artifacts: ArtifactSummary[];
  onDelete?: (id: string) => void;
}

export function DocumentGrid({ artifacts, onDelete }: DocumentGridProps): React.JSX.Element {
  return (
    <section>
      <div className="flex items-center justify-between mb-md">
        <h2 className="text-title-sm font-title-sm text-on-surface m-0">Recent Documents</h2>
        {artifacts.length > 0 && (
          <a href="#" className="text-body-sm font-body-sm text-secondary">
            View All →
          </a>
        )}
      </div>

      {artifacts.length === 0 ? (
        <p className="text-body-sm font-body-sm text-on-surface-variant">No documents yet.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-md">
          {artifacts.map((artifact) => (
            <DocumentCard key={artifact.id} artifact={artifact} onDelete={onDelete} />
          ))}
        </div>
      )}
    </section>
  );
}
