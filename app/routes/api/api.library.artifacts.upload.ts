import busboy from "busboy";
import { Readable } from "node:stream";
import { data, type ActionFunctionArgs } from "react-router";
import { loginController, libraryController } from "@backend-main/controller.instances";
import { enforceAuth } from "@backend-platform/infrastructure/route-utils/auth-middleware.server";
import {
  DuplicateArtifactError,
  FileTooLargeError,
  FileTooSmallError,
  InvalidFileTypeError,
} from "@backend-application/library/errors";

const MAX_UPLOAD_BYTES = 26_214_400;

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return data({ error: "Method Not Allowed" }, { status: 405 });
  }

  const ctx = await enforceAuth(loginController, request);

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.startsWith("multipart/form-data")) {
    return data({ error: "Expected multipart/form-data" }, { status: 400 });
  }

  const { buffer, filename, mimeType, truncated, fileReceived } = await parseMultipart(request, contentType);

  if (!fileReceived) {
    return data({ error: "No file provided" }, { status: 400 });
  }
  if (truncated) {
    return data({ error: "File exceeds the 25 MB limit" }, { status: 413 });
  }

  try {
    const artifact = await libraryController.upload(ctx.user.id, buffer, filename);
    return data({ artifact }, { status: 200 });
  } catch (err) {
    if (err instanceof FileTooSmallError) return data({ error: err.message }, { status: 400 });
    if (err instanceof FileTooLargeError) return data({ error: err.message }, { status: 413 });
    if (err instanceof InvalidFileTypeError) return data({ error: err.message }, { status: 415 });
    if (err instanceof DuplicateArtifactError) return data({ error: err.message }, { status: 409 });
    throw err;
  }
}

async function parseMultipart(
  request: Request,
  contentType: string,
): Promise<{
  buffer: Buffer;
  filename: string;
  mimeType: string;
  truncated: boolean;
  fileReceived: boolean;
}> {
  return new Promise((resolve, reject) => {
    const bb = busboy({ headers: { "content-type": contentType }, limits: { files: 1, fileSize: MAX_UPLOAD_BYTES + 1 } });

    const chunks: Buffer[] = [];
    let filename = "upload.pdf";
    let mimeType = "application/octet-stream";
    let truncated = false;
    let fileReceived = false;

    bb.on("file", (_field, stream, info) => {
      fileReceived = true;
      filename = info.filename || filename;
      mimeType = info.mimeType || mimeType;
      stream.on("data", (chunk: Buffer) => chunks.push(chunk));
      stream.on("limit", () => { truncated = true; });
      stream.on("error", reject);
    });

    bb.on("finish", () => {
      resolve({ buffer: Buffer.concat(chunks), filename, mimeType, truncated, fileReceived });
    });

    bb.on("error", reject);

    const nodeStream = Readable.fromWeb(request.body as import("stream/web").ReadableStream);
    nodeStream.pipe(bb);
  });
}
