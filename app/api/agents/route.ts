import { NextResponse } from "next/server";
import { store } from "@/lib/store";
import { parseRegisterAgent, parseAgentEvent } from "@/lib/validators/task";
import { makeId } from "@/lib/utils/id";

const UNKNOWN_ERROR = "未知错误";

// GET /api/agents - 获取活跃 Agent 列表
export async function GET() {
  try {
    const agents = await store.listAgents();
    return NextResponse.json({ agents });
  } catch (error) {
    const message = error instanceof Error ? error.message : UNKNOWN_ERROR;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/agents/events - 接收 Agent 事件上报
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // 判断是注册 Agent 还是上报事件
    if (body && typeof body === "object" && "name" in body && !("type" in body)) {
      // 注册新 Agent
      const input = parseRegisterAgent(body);
      const agentId = input.agentId ?? makeId("agent");
      const exists = await store.getAgent(agentId);
      if (exists) {
        return NextResponse.json({ error: "agentId 已存在。" }, { status: 409 });
      }

      const agent = await store.registerAgent(agentId, input.name, input.parentAgentId, input.sessionId);
      
      // 自动记录 agent_spawned 事件
      await store.appendAgentEvent({
        agentId,
        type: "agent_spawned",
        message: `Agent "${input.name}" 已启动`,
        metadata: {
          parentAgentId: input.parentAgentId,
          sessionId: input.sessionId,
        },
      });
      
      return NextResponse.json({ agent }, { status: 201 });
    } else {
      // 上报事件
      const input = parseAgentEvent(body);
      const event = await store.appendAgentEvent(input);
      return NextResponse.json({ event }, { status: 201 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : UNKNOWN_ERROR;
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
