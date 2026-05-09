export interface PdfParser {
  getPageCount(buffer: Buffer): Promise<number>;
}
