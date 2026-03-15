import { NextRequest } from "next/server";
import { store } from "@/lib/store";

const TASK_NOT_FOUND = "任务不存在。";

type Params = {
  params: Promise<{ taskId: string }>;
};

// GET /api/tasks/[taskId]/events/stream - SSE 实时事件流
export async function GET(request: NextRequest, { params }: Params) {
  const { taskId } = await params;
  const task = await store.getTask(taskId);
  
  if (!task) {
    return new Response(JSON.stringify({ error: TASK_NOT_FOUND }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 创建 ReadableStream 用于 SSE
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      let lastEventId = 0;
      let isClosed = false;

      // 发送初始事件
      const sendEvent = (data: object) => {
        if (isClosed) return;
        try {
          const message = `data: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(message));
        } catch {
          // Stream closed
        }
      };

      // 初始发送现有事件
      const initialEvents = await store.listTaskEvents(taskId);
      sendEvent({ type: "init", events: initialEvents, count: initialEvents.length });

      // 轮询检查新事件
      const pollInterval = setInterval(async () => {
        try {
          const events = await store.listTaskEvents(taskId);
          
          // 检查是否有新事件
          if (events.length > lastEventId) {
            const newEvents = events.slice(0, events.length - lastEventId);
            lastEventId = events.length;
            sendEvent({ type: "new", events: newEvents });
          }
          
          // 发送心跳保持连接
          sendEvent({ type: "heartbeat", timestamp: Date.now() });
        } catch (error) {
          sendEvent({ type: "error", message: error instanceof Error ? error.message : "Unknown error" });
        }
      }, 2000); // 每2秒检查一次

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
