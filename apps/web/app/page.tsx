import { Dashboard } from "../components/dashboard";
import { loadDashboardSnapshot } from "../lib/dashboard-server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const initialSnapshot = await loadDashboardSnapshot();

  return <Dashboard initialSnapshot={initialSnapshot} />;
}
