export interface PdfParserGateway {
  parsePdf(buffer: Buffer): Promise<{ pageCount: number }>;
}
