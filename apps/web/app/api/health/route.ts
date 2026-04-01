import { NextResponse } from "next/server";
import { getWebRuntimeConfig } from "../../../lib/runtime";

export async function GET() {
  const config = getWebRuntimeConfig();

  return NextResponse.json({
    service: "web",
    ok: true,
    traderBaseUrl: config.traderBaseUrl,
  });
}
