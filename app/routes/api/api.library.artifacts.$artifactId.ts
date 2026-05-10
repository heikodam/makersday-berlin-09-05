import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { libraryController } from "@backend-main/controller.instances";

export async function loader({ request, params }: LoaderFunctionArgs): Promise<Response> {
  return libraryController.streamArtifact(request, params.artifactId!);
}

export async function action({ request, params }: ActionFunctionArgs): Promise<Response> {
  if (request.method === "DELETE") {
    return libraryController.deleteArtifact(request, params.artifactId!);
  }
  return new Response("Method Not Allowed", { status: 405 });
}
