import type { PdfParserGateway } from "@backend-application/library/pdf-parser.gateway";

export class FakePdfParserGateway implements PdfParserGateway {
  constructor(private readonly pageCount: number = 10) {}

  async parsePdf(_buffer: Buffer): Promise<{ pageCount: number }> {
    return { pageCount: this.pageCount };
  }
}
