import { NextResponse } from "next/server";
import { store } from "@/lib/store";

const UNKNOWN_ERROR = "未知错误";

// GET /api/subagents - 获取子 Agent 列表
// Query: parentAgent optional
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parentAgent = searchParams.get("parentAgent") || undefined;
    
    const subAgents = await store.listSubAgents(parentAgent);
    return NextResponse.json({ subAgents });
  } catch (error) {
    const message = error instanceof Error ? error.message : UNKNOWN_ERROR;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/subagents - 创建子 Agent
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { parentAgent, name, description, tags } = body;
    
    if (!parentAgent || !name) {
      return NextResponse.json(
        { error: "缺少必要字段：parentAgent, name" },
        { status: 400 }
      );
    }
    
    const subAgent = await store.createSubAgent({
      parentAgent,
      name,
      description,
      tags,
    });
    
    return NextResponse.json({ subAgent }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : UNKNOWN_ERROR;
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
