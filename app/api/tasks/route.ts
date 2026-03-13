import { NextResponse } from "next/server";
import { store } from "@/lib/store";
import { parseCreateTask } from "@/lib/validators/task";

const UNKNOWN_ERROR = "\u672a\u77e5\u9519\u8bef";

export async function GET() {
  const tasks = await store.listTasks();
  return NextResponse.json({ tasks });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = parseCreateTask(body);
    const task = await store.createTask(input);

    await store.appendTaskEvent(task.taskId, {
      type: "task_created",
      actor: input.assignedAgent ?? "root",
      message: `\u5df2\u521b\u5efa\u4efb\u52a1\uff1a${task.title}`,
      metadata: {
        visibility: task.visibility,
        inputRefs: task.inputRefs,
        assignedAgent: task.assignedAgent,
      },
    });

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : UNKNOWN_ERROR;
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
