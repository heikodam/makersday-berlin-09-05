import { data, type ActionFunctionArgs, type LoaderFunctionArgs } from "react-router";
import { loginController, libraryController } from "@backend-main/controller.instances";
import { enforceAuth } from "@backend-platform/infrastructure/route-utils/auth-middleware.server";
import { ArtifactNotFoundError } from "@backend-application/library/errors";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const ctx = await enforceAuth(loginController, request);
  const artifactId = params.artifactId;
  if (!artifactId) return data({ error: "Missing artifactId" }, { status: 400 });

  try {
    const { buffer, mimeType, filename } = await libraryController.getArtifactFile(ctx.user.id, artifactId);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(filename)}.pdf"`,
        "Content-Length": String(buffer.length),
      },
    });
  } catch (err) {
    if (err instanceof ArtifactNotFoundError) return data({ error: err.message }, { status: 404 });
    throw err;
  }
}

export async function action({ request, params }: ActionFunctionArgs) {
  if (request.method !== "DELETE") {
    return data({ error: "Method Not Allowed" }, { status: 405 });
  }

  const ctx = await enforceAuth(loginController, request);
  const artifactId = params.artifactId;
  if (!artifactId) return data({ error: "Missing artifactId" }, { status: 400 });

  try {
    await libraryController.deleteArtifact(ctx.user.id, artifactId);
    return data({ ok: true });
  } catch (err) {
    if (err instanceof ArtifactNotFoundError) return data({ error: err.message }, { status: 404 });
    throw err;
  }
}
