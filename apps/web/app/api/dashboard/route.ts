import { NextResponse } from "next/server";

import { loadDashboardSnapshot } from "../../../lib/dashboard-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const snapshot = await loadDashboardSnapshot();
  return NextResponse.json(snapshot);
}
