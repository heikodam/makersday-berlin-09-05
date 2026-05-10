import { Readable } from "node:stream";
import { v4 as uuidv4 } from "uuid";
import type { PdfStorageGateway } from "@backend-application/library/pdf-storage.gateway";

export class InMemoryPdfStorageGateway implements PdfStorageGateway {
  private readonly store = new Map<string, Buffer>();

  async putPdf(buffer: Buffer): Promise<{ storageUri: string }> {
    const id = uuidv4();
    const storageUri = `memory://${id}`;
    this.store.set(storageUri, buffer);
    return { storageUri };
  }

  async openPdfStream(storageUri: string): Promise<Readable> {
    const buf = this.store.get(storageUri);
    if (!buf) throw new Error(`Not found: ${storageUri}`);
    return Readable.from(buf);
  }

  async deletePdf(storageUri: string): Promise<void> {
    this.store.delete(storageUri);
  }

  has(storageUri: string): boolean {
    return this.store.has(storageUri);
  }
}
