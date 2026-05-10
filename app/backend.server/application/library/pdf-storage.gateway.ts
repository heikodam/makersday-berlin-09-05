import type { Readable } from "node:stream";

export interface PdfStorageGateway {
  putPdf(buffer: Buffer): Promise<{ storageUri: string }>;
  openPdfStream(storageUri: string): Promise<Readable>;
  deletePdf(storageUri: string): Promise<void>;
}
