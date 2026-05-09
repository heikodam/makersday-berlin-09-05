import { useLoaderData, type LoaderFunctionArgs } from "react-router";
import { loginController, libraryController } from "@backend-main/controller.instances";
import { enforceAuth } from "@backend-platform/infrastructure/route-utils/auth-middleware.server";
import { toAuthenticatedUserDto } from "@backend-application/authentication/auth.dto";
import { LibraryView } from "@components/domain/library/LibraryView";
import type { ArtifactDto } from "~/routes/api/api.library.artifacts._sdk";

export const meta = () => [{ title: "Scholastic AI | Library" }];

export async function loader({ request }: LoaderFunctionArgs) {
  const ctx = await enforceAuth(loginController, request);
  const artifacts = await libraryController.listArtifacts(ctx.user.id);
  return { user: toAuthenticatedUserDto(ctx.user), artifacts };
}

export default function LibraryPage(): React.JSX.Element {
  const { artifacts } = useLoaderData<typeof loader>();
  return <LibraryView initialArtifacts={artifacts as ArtifactDto[]} />;
}
