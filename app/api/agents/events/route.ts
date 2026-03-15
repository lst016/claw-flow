import { NextResponse } from "next/server";
import { store } from "@/lib/store";
import { parseAgentEvent } from "@/lib/validators/task";

const UNKNOWN_ERROR = "未知错误";

// GET /api/agents/events - 获取 Agent 事件日志
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get("agentId") ?? undefined;
    const limit = parseInt(searchParams.get("limit") ?? "50", 10);
    
    const events = await store.listAgentEvents(agentId);
    
    // 限制返回数量
    const limitedEvents = events.slice(0, limit);
    
    return NextResponse.json({ events: limitedEvents });
  } catch (error) {
    const message = error instanceof Error ? error.message : UNKNOWN_ERROR;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/agents/events - 提交 Agent 事件
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = parseAgentEvent(body);
    
    // 检查 agent 是否存在
    const agent = await store.getAgent(input.agentId);
    if (!agent) {
      return NextResponse.json({ error: "Agent 不存在，请先注册 Agent。" }, { status: 404 });
    }
    
    const event = await store.appendAgentEvent(input);
    
    // 如果是状态变更事件，更新 agent 状态
    if (input.type === "agent_state_changed" && input.metadata?.status) {
      await store.updateAgent(input.agentId, {
        status: input.metadata.status as "idle" | "running" | "waiting" | "completed" | "failed",
      });
    }
    
    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : UNKNOWN_ERROR;
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
