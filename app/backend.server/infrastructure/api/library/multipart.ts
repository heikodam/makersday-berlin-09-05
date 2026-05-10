import { Readable } from "node:stream";
import busboy from "busboy";

export interface ParsedFile {
  fileName: string;
  mimeType: string;
  stream: Readable;
}

export async function parseMultipartFile(request: Request, maxFileSize: number): Promise<ParsedFile> {
  const contentType = request.headers.get("content-type") ?? "";
  const bb = busboy({ headers: { "content-type": contentType }, limits: { fileSize: maxFileSize + 1 } });

  return new Promise((resolve, reject) => {
    let resolved = false;

    bb.on("file", (_fieldname, fileStream, info) => {
      if (resolved) {
        fileStream.resume();
        return;
      }
      resolved = true;
      resolve({
        fileName: info.filename,
        mimeType: info.mimeType,
        stream: fileStream as unknown as Readable,
      });
    });

    bb.on("error", reject);
    bb.on("close", () => {
      if (!resolved) reject(new Error("No file found in multipart upload"));
    });

    if (!request.body) {
      reject(new Error("No request body"));
      return;
    }
    Readable.fromWeb(request.body as Parameters<typeof Readable.fromWeb>[0]).pipe(bb);
  });
}
