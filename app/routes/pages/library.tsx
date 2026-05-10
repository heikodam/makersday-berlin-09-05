import { useLoaderData, type LoaderFunctionArgs } from "react-router";
import { libraryController } from "@backend-main/controller.instances";
import { LibraryView } from "@components/domain/library/LibraryView";
import type { ArtifactSummary } from "@components/domain/library/DocumentGrid";

export const meta = (): Array<{ title: string }> => {
  return [{ title: "Scholastic AI | Library" }];
};

export async function loader({ request }: LoaderFunctionArgs): Promise<{ artifacts: ArtifactSummary[] }> {
  const res = await libraryController.listArtifacts(request);
  const json = await res.json() as { artifacts: ArtifactSummary[] };
  return { artifacts: json.artifacts };
}

export default function LibraryPage(): React.JSX.Element {
  const data = useLoaderData<typeof loader>();
  return <LibraryView artifacts={data.artifacts} />;
}
