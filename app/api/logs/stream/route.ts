import { NextRequest } from "next/server";
import { store } from "@/lib/store";

// 统一的日志流 API，支持多种事件类型
// GET /api/logs/stream?type=task|agent|all&taskId=xxx&agentId=xxx
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "all";
  const taskId = queryParamToString(searchParams.get("taskId"));
  const agentId = queryParamToString(searchParams.get("agentId"));

  // 创建 ReadableStream 用于 SSE
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      let taskEventCount = 0;
      let agentEventCount = 0;
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

      // 收集初始事件
      const initData: {
        taskEvents?: Array<unknown>;
        agentEvents?: Array<unknown>;
        taskCount?: number;
        agentCount?: number;
      } = {};

      if (type === "all" || type === "task") {
        if (taskId) {
          // 指定了 taskId，返回该任务的事件
          const taskEvents = await store.listTaskEvents(taskId);
          initData.taskEvents = taskEvents;
          initData.taskCount = taskEvents.length;
          taskEventCount = taskEvents.length;
        } else if (type === "all") {
          // type=all 且没有指定 taskId，返回所有任务的事件
          const allTasks = await store.listTasks();
          const allTaskEvents: unknown[] = [];
          for (const task of allTasks) {
            const events = await store.listTaskEvents(task.taskId);
            allTaskEvents.push(...events);
          }
          // 按时间排序，最新的在前
          allTaskEvents.sort((a: any, b: any) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          initData.taskEvents = allTaskEvents;
          initData.taskCount = allTaskEvents.length;
          taskEventCount = allTaskEvents.length;
        }
      }

      if (type === "all" || type === "agent") {
        let agentEvents = await store.listAgentEvents(agentId ?? undefined);
        
        // 如果指定了 taskId，过滤相关事件
        if (taskId) {
          agentEvents = agentEvents.filter(
            (e) => e.metadata?.taskId === taskId
          );
        }
        
        initData.agentEvents = agentEvents;
        initData.agentCount = agentEvents.length;
        agentEventCount = agentEvents.length;
      }

      sendEvent({ type: "init", ...initData });

      // 轮询检查新事件
      const pollInterval = setInterval(async () => {
        try {
          // 检查任务事件
          if (type === "all" || type === "task") {
            if (taskId) {
              const taskEvents = await store.listTaskEvents(taskId);
              if (taskEvents.length > taskEventCount) {
                const newEvents = taskEvents.slice(0, taskEvents.length - taskEventCount);
                taskEventCount = taskEvents.length;
                sendEvent({ type: "task_new", events: newEvents, source: "task" });
              }
            }
          }

          // 检查 Agent 事件
          if (type === "all" || type === "agent") {
            let agentEvents = await store.listAgentEvents(agentId ?? undefined);
            
            if (taskId) {
              agentEvents = agentEvents.filter(
                (e) => e.metadata?.taskId === taskId
              );
            }
            
            if (agentEvents.length > agentEventCount) {
              const newEvents = agentEvents.slice(0, agentEvents.length - agentEventCount);
              agentEventCount = agentEvents.length;
              sendEvent({ type: "agent_new", events: newEvents, source: "agent" });
            }
          }
          
          // 发送心跳保持连接
          sendEvent({ type: "heartbeat", timestamp: Date.now() });
        } catch (error) {
          sendEvent({ type: "error", message: error instanceof Error ? error.message : "Unknown error" });
        }
      }, 1500); // 每1.5秒检查一次

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
