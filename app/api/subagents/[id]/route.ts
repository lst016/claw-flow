import { NextResponse } from "next/server";
import { store } from "@/lib/store";

const UNKNOWN_ERROR = "未知错误";
const SUBAGENT_NOT_FOUND = "子 Agent 不存在。";

type Params = {
  params: Promise<{ id: string }>;
};

// GET /api/subagents/[id] - 获取单个子 Agent
export async function GET(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const subAgent = await store.getSubAgent(id);
    
    if (!subAgent) {
      return NextResponse.json({ error: SUBAGENT_NOT_FOUND }, { status: 404 });
    }
    
    return NextResponse.json({ subAgent });
  } catch (error) {
    const message = error instanceof Error ? error.message : UNKNOWN_ERROR;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH /api/subagents/[id] - 更新子 Agent
export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    const subAgent = await store.updateSubAgent(id, {
      name: body.name,
      description: body.description,
      tags: body.tags,
      enabled: body.enabled,
    });
    
    if (!subAgent) {
      return NextResponse.json({ error: SUBAGENT_NOT_FOUND }, { status: 404 });
    }
    
    return NextResponse.json({ subAgent });
  } catch (error) {
    const message = error instanceof Error ? error.message : UNKNOWN_ERROR;
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

// DELETE /api/subagents/[id] - 删除子 Agent
export async function DELETE(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const deleted = await store.deleteSubAgent(id);
    
    if (!deleted) {
      return NextResponse.json({ error: SUBAGENT_NOT_FOUND }, { status: 404 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : UNKNOWN_ERROR;
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
