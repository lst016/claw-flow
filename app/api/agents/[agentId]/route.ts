import { NextResponse } from "next/server";
import { store } from "@/lib/store";
import { parseUpdateAgent } from "@/lib/validators/task";

const UNKNOWN_ERROR = "未知错误";
const AGENT_NOT_FOUND = "Agent 不存在。";

type Params = {
  params: Promise<{ agentId: string }>;
};

export async function GET(_: Request, { params }: Params) {
  try {
    const { agentId } = await params;
    const agent = await store.getAgent(agentId);
    
    if (!agent) {
      return NextResponse.json({ error: AGENT_NOT_FOUND }, { status: 404 });
    }
    
    return NextResponse.json({ agent });
  } catch (error) {
    const message = error instanceof Error ? error.message : UNKNOWN_ERROR;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { agentId } = await params;
    const body = await request.json();
    const input = parseUpdateAgent(body);
    
    const agent = await store.getAgent(agentId);
    if (!agent) {
      return NextResponse.json({ error: AGENT_NOT_FOUND }, { status: 404 });
    }

    if (input.parentAgentId === agentId) {
      return NextResponse.json({ error: "parentAgentId 不能指向自己。" }, { status: 400 });
    }

    const updated = await store.updateAgent(agentId, input);
    return NextResponse.json({ agent: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : UNKNOWN_ERROR;
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_: Request, { params }: Params) {
  try {
    const { agentId } = await params;
    const agent = await store.getAgent(agentId);
    if (!agent) {
      return NextResponse.json({ error: AGENT_NOT_FOUND }, { status: 404 });
    }

    // 删除父 Agent 前先把它的直接子 Agent 挂到上一级，避免悬挂引用。
    const agents = await store.listAgents();
    const children = agents.filter((item) => item.parentAgentId === agentId);
    for (const child of children) {
      await store.updateAgent(child.agentId, {
        parentAgentId: agent.parentAgentId,
      });
    }

    const removed = await store.removeAgent(agentId);
    return NextResponse.json({ success: removed });
  } catch (error) {
    const message = error instanceof Error ? error.message : UNKNOWN_ERROR;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Heartbeat endpoint
export async function PUT(request: Request, { params }: Params) {
  try {
    const { agentId } = await params;
    const agent = await store.heartbeatAgent(agentId);
    
    if (!agent) {
      return NextResponse.json({ error: AGENT_NOT_FOUND }, { status: 404 });
    }
    
    return NextResponse.json({ agent });
  } catch (error) {
    const message = error instanceof Error ? error.message : UNKNOWN_ERROR;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
