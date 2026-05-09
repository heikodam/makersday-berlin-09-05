import { data, type LoaderFunctionArgs } from "react-router";
import { loginController, libraryController } from "@backend-main/controller.instances";
import { enforceAuth } from "@backend-platform/infrastructure/route-utils/auth-middleware.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const ctx = await enforceAuth(loginController, request);
  const artifacts = await libraryController.listArtifacts(ctx.user.id);
  return data({ artifacts });
}
