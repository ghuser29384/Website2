import { HomePage } from "@/components/home/home-page";
import { getViewer } from "@/lib/app-data";

export default async function Page() {
  const viewer = await getViewer();

  return <HomePage isAuthenticated={Boolean(viewer)} />;
}
