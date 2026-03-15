import { NextResponse } from "next/server";
import { store } from "@/lib/store";

const AGENT_NOT_FOUND = "Agent 不存在。";
const UNKNOWN_ERROR = "未知错误";

type Params = {
  params: Promise<{ agentId: string }>;
};

// POST /api/agents/:agentId/heartbeat - Agent 心跳保活
export async function POST(request: Request, { params }: Params) {
  try {
    const { agentId } = await params;
    const body = await request.json().catch(() => ({})); // 支持无 body 请求
    
    const agent = await store.heartbeatAgent(agentId);
    
    if (!agent) {
      return NextResponse.json({ error: AGENT_NOT_FOUND }, { status: 404 });
    }
    
    // 记录心跳事件（可选，如果需要可以取消注释）
    // await store.appendAgentEvent({
    //   agentId,
    //   type: "agent_heartbeat",
    //   message: "Agent 心跳",
    //   metadata: body.metadata,
    // });
    
    return NextResponse.json({ agent });
  } catch (error) {
    const message = error instanceof Error ? error.message : UNKNOWN_ERROR;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
