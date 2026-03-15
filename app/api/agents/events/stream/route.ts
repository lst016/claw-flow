import { NextRequest } from "next/server";
import { store } from "@/lib/store";

// GET /api/agents/events/stream - SSE 实时 Agent 事件流
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const agentId = queryParamToString(searchParams.get("agentId"));
  const taskId = queryParamToString(searchParams.get("taskId"));

  // 创建 ReadableStream 用于 SSE
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      let lastEventCount = 0;
      let isClosed = false;

      const sendEvent = (data: object) => {
        if (isClosed) return;
        try {
          const message = `data: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(message));
        } catch {
          // Stream closed
        }
      };

      // 发送初始事件
      const initialEvents = await store.listAgentEvents(agentId ?? undefined);
      const filteredEvents = filterEvents(initialEvents, agentId, taskId);
      sendEvent({ type: "init", events: filteredEvents, count: filteredEvents.length });
      lastEventCount = filteredEvents.length;

      // 轮询检查新事件
      const pollInterval = setInterval(async () => {
        try {
          const allEvents = await store.listAgentEvents(agentId ?? undefined);
          const filtered = filterEvents(allEvents, agentId, taskId);
          
          // 检查是否有新事件
          if (filtered.length > lastEventCount) {
            const newEvents = filtered.slice(0, filtered.length - lastEventCount);
            lastEventCount = filtered.length;
            sendEvent({ type: "new", events: newEvents });
          }
          
          // 发送心跳保持连接
          sendEvent({ type: "heartbeat", timestamp: Date.now() });
        } catch (error) {
          sendEvent({ type: "error", message: error instanceof Error ? error.message : "Unknown error" });
        }
      }, 2000);

      // 处理客户端断开连接
      request.signal.addEventListener("abort", () => {
        isClosed = true;
        clearInterval(pollInterval);
        try {
          controller.close();
        } catch {
          // Already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

function queryParamToString(value: string | null): string | undefined {
  return value ?? undefined;
}

function filterEvents(
  events: Array<{ agentId: string; taskId?: string }>,
  agentId?: string,
  taskId?: string
) {
  return events.filter((event) => {
    if (agentId && event.agentId !== agentId) return false;
    if (taskId && event.taskId !== taskId) return false;
    return true;
  });
}
