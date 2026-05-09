import { PDFParse } from "pdf-parse";
import type { PdfParser } from "@backend-application/library/pdf-parser";

export class PdfParseAdapter implements PdfParser {
  async getPageCount(buffer: Buffer): Promise<number> {
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    const info = await parser.getInfo();
    return info.total;
  }
}
