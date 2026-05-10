import { enforceAuth } from "@backend-platform/infrastructure/route-utils/auth-middleware.server";
import type { LoginController } from "@backend-infrastructure/api/login-controller";
import type { LibraryService } from "@backend-application/library/library.service";
import type { LibraryConfig } from "@backend-application/library/config";
import {
  InvalidPdfError,
  FileTooSmallError,
  FileTooLargeError,
  DuplicateArtifactError,
  PdfParseError,
} from "@backend-application/library/errors";
import { parseMultipartFile } from "./multipart";

export class LibraryController {
  constructor(
    private readonly service: LibraryService,
    private readonly auth: LoginController,
    private readonly config: LibraryConfig,
  ) {}

  async uploadArtifact(request: Request): Promise<Response> {
    const contentLength = parseInt(request.headers.get("content-length") ?? "0", 10);
    if (contentLength > this.config.maxByteSize) {
      return Response.json({ error: "File exceeds the 25 MB limit" }, { status: 413 });
    }

    const ctx = await enforceAuth(this.auth, request);

    try {
      const file = await parseMultipartFile(request, this.config.maxByteSize);
      const dto = await this.service.uploadArtifact({
        userId: ctx.user.id,
        fileName: file.fileName,
        mimeType: file.mimeType,
        stream: file.stream,
      });
      return Response.json(dto, { status: 201 });
    } catch (err) {
      return this._mapError(err);
    }
  }

  async listArtifacts(request: Request): Promise<Response> {
    const ctx = await enforceAuth(this.auth, request);
    const artifacts = await this.service.listArtifacts(ctx.user.id);
    return Response.json({ artifacts });
  }

  async deleteArtifact(request: Request, artifactId: string): Promise<Response> {
    const ctx = await enforceAuth(this.auth, request);
    await this.service.removeArtifact(ctx.user.id, artifactId);
    return new Response(null, { status: 204 });
  }

  async streamArtifact(request: Request, artifactId: string): Promise<Response> {
    const ctx = await enforceAuth(this.auth, request);
    const artifacts = await this.service.listArtifacts(ctx.user.id);
    const artifact = artifacts.find((a) => a.id === artifactId);
    if (!artifact) return new Response(null, { status: 404 });
    return new Response(null, { status: 200 });
  }

  private _mapError(err: unknown): Response {
    if (err instanceof InvalidPdfError) return Response.json({ error: err.message }, { status: 415 });
    if (err instanceof FileTooSmallError) return Response.json({ error: err.message }, { status: 400 });
    if (err instanceof FileTooLargeError) return Response.json({ error: err.message }, { status: 413 });
    if (err instanceof DuplicateArtifactError) return Response.json({ error: err.message }, { status: 409 });
    if (err instanceof PdfParseError) return Response.json({ error: err.message }, { status: 422 });
    throw err;
  }
}
