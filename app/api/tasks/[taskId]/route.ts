import { NextResponse } from "next/server";
import { store } from "@/lib/store";
import { parseUpdateTask } from "@/lib/validators/task";

const TASK_NOT_FOUND = "\u4efb\u52a1\u4e0d\u5b58\u5728\u3002";
const UNKNOWN_ERROR = "\u672a\u77e5\u9519\u8bef";

type Params = {
  params: Promise<{ taskId: string }>;
};

export async function GET(_: Request, { params }: Params) {
  const { taskId } = await params;
  const task = await store.getTask(taskId);

  if (!task) {
    return NextResponse.json({ error: TASK_NOT_FOUND }, { status: 404 });
  }

  const artifact = task.detailRef ? await store.getArtifact(task.detailRef) : null;
  return NextResponse.json({ task, artifact });
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { taskId } = await params;
    const body = await request.json();
    const input = parseUpdateTask(body);
    const task = await store.updateTask(taskId, input);

    if (!task) {
      return NextResponse.json({ error: TASK_NOT_FOUND }, { status: 404 });
    }

    await store.appendTaskEvent(taskId, {
      type: task.status === "completed" ? "task_completed" : task.status === "failed" ? "task_failed" : "task_updated",
      actor: input.claimedBy ?? input.assignedAgent ?? "root",
      message:
        task.status === "completed"
          ? `\u4efb\u52a1\u5df2\u5b8c\u6210\uff1a${task.title}`
          : task.status === "failed"
            ? `\u4efb\u52a1\u6267\u884c\u5931\u8d25\uff1a${task.title}`
            : `\u4efb\u52a1\u5df2\u66f4\u65b0\uff1a${task.title}`,
      metadata: {
        status: task.status,
        visibility: task.visibility,
        inputRefs: task.inputRefs,
        outputRefs: task.outputRefs,
      },
    });

    return NextResponse.json({ task });
  } catch (error) {
    const message = error instanceof Error ? error.message : UNKNOWN_ERROR;
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
