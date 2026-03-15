import { NextResponse } from "next/server";
import { store } from "@/lib/store";

const UNKNOWN_ERROR = "未知错误";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { taskIds, action, payload } = body;

    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      return NextResponse.json({ error: "缺少 taskIds 参数" }, { status: 400 });
    }

    if (!action) {
      return NextResponse.json({ error: "缺少 action 参数" }, { status: 400 });
    }

    const validActions = ["update_status", "delete", "assign_agent", "add_tags", "remove_tags"];
    if (!validActions.includes(action)) {
      return NextResponse.json({ error: "无效的 action 类型" }, { status: 400 });
    }

    const result = await store.batchUpdate({
      taskIds,
      action,
      payload,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : UNKNOWN_ERROR;
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
