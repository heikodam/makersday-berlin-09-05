import { useRef, useState } from "react";

interface UploadDropzoneProps {
  onFileSelected: (file: File) => void;
  isUploading?: boolean;
}

export function UploadDropzone({ onFileSelected, isUploading }: UploadDropzoneProps): React.JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  function handleDrop(e: React.DragEvent<HTMLDivElement>): void {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) onFileSelected(file);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0];
    if (file) onFileSelected(file);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div
      className={`border-2 border-dashed rounded-xl flex flex-col items-center justify-center py-xl px-md gap-md bg-surface-container-lowest min-h-[200px] transition-colors ${
        isDragOver ? "border-secondary bg-secondary-container/10" : "border-outline-variant"
      }`}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
    >
      <div className="flex flex-col items-center gap-sm text-center">
        <div className="w-12 h-12 rounded-xl bg-surface-container flex items-center justify-center text-on-surface-variant">
          <span className="material-symbols-outlined text-[28px]" aria-hidden="true">upload_file</span>
        </div>
        <div>
          <p className="text-title-sm font-title-sm text-on-surface m-0">Drag &amp; Drop PDF here</p>
          <p className="text-body-sm font-body-sm text-on-surface-variant m-0 mt-xs">
            Upload your research papers, books, or documents to begin analyzing and chatting with them.
          </p>
        </div>
      </div>

      <button
        type="button"
        disabled={isUploading}
        className="bg-surface-container-lowest border border-outline-variant text-on-surface text-body-md font-body-md rounded-lg py-xs px-md hover:bg-surface-container transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={() => inputRef.current?.click()}
      >
        {isUploading ? "Uploading…" : "Browse Files"}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="sr-only"
        aria-label="Upload PDF file"
        onChange={handleFileInput}
      />
    </div>
  );
}
