import { NextResponse } from "next/server";
import { store } from "@/lib/store";
import { parseClaimTask } from "@/lib/validators/task";

const TASK_NOT_FOUND = "\u4efb\u52a1\u4e0d\u5b58\u5728\u3002";
const UNKNOWN_ERROR = "\u672a\u77e5\u9519\u8bef";

type Params = {
  params: Promise<{ taskId: string }>;
};

export async function POST(request: Request, { params }: Params) {
  try {
    const { taskId } = await params;
    const body = await request.json();
    const input = parseClaimTask(body);
    const task = await store.claimTask(taskId, input);

    if (!task) {
      return NextResponse.json({ error: TASK_NOT_FOUND }, { status: 404 });
    }

    await store.appendTaskEvent(taskId, {
      type: "task_claimed",
      actor: input.actor,
      message: `\u4efb\u52a1\u5df2\u88ab ${input.actor} \u9886\u53d6\u3002`,
      metadata: {
        leaseExpiresAt: task.leaseExpiresAt,
      },
    });

    return NextResponse.json({ task }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : UNKNOWN_ERROR;
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const { taskId } = await params;
    const actor = new URL(request.url).searchParams.get("actor") ?? undefined;
    const task = await store.releaseTask(taskId, actor);

    if (!task) {
      return NextResponse.json({ error: TASK_NOT_FOUND }, { status: 404 });
    }

    await store.appendTaskEvent(taskId, {
      type: "task_released",
      actor,
      message: actor ? `\u4efb\u52a1\u5df2\u7531 ${actor} \u91ca\u653e\u3002` : "\u4efb\u52a1\u79df\u7ea6\u5df2\u91ca\u653e\u3002",
    });

    return NextResponse.json({ task }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : UNKNOWN_ERROR;
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
