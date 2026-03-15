import { NextResponse } from "next/server";
import type { TokenUsageResponse } from "@/lib/types/task";

const UNKNOWN_ERROR = "未知错误";

export async function GET() {
  try {
    // Get token usage from OpenClaw gateway
    const result = await fetch("http://127.0.0.1:18789/api/usage/cost", {
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!result.ok) {
      throw new Error(`Gateway error: ${result.status}`);
    }

    const data = (await result.json()) as TokenUsageResponse;
    return NextResponse.json(data);
  } catch (error) {
    // If gateway is not available, try using CLI
    try {
      const { execSync } = await import("child_process");
      const output = execSync("openclaw gateway usage-cost --json", {
        encoding: "utf-8",
        timeout: 15000,
      });
      const data = JSON.parse(output) as TokenUsageResponse;
      return NextResponse.json(data);
    } catch (cliError) {
      const message = error instanceof Error ? error.message : UNKNOWN_ERROR;
      console.error("Token usage fetch error:", cliError);
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }
}
