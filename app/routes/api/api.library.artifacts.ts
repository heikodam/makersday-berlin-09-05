import type { LoaderFunctionArgs } from "react-router";
import { libraryController } from "@backend-main/controller.instances";

export async function loader({ request }: LoaderFunctionArgs): Promise<Response> {
  return libraryController.listArtifacts(request);
}
