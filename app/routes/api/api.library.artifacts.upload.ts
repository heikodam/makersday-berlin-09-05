import type { ActionFunctionArgs } from "react-router";
import { libraryController } from "@backend-main/controller.instances";

export async function action({ request }: ActionFunctionArgs): Promise<Response> {
  return libraryController.uploadArtifact(request);
}
