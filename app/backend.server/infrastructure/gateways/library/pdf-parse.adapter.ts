import { PDFParse } from "pdf-parse";
import type { PdfParserGateway } from "@backend-application/library/pdf-parser.gateway";

export class PdfParseParserAdapter implements PdfParserGateway {
  async parsePdf(buffer: Buffer): Promise<{ pageCount: number }> {
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    const result = await parser.getInfo();
    await parser.destroy();
    return { pageCount: result.total };
  }
}
