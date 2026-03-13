import { NextResponse } from "next/server";
import { store } from "@/lib/store";
import { parseTaskEvent } from "@/lib/validators/task";

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

  const events = await store.listTaskEvents(taskId);
  return NextResponse.json({ events });
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { taskId } = await params;
    const task = await store.getTask(taskId);
    if (!task) {
      return NextResponse.json({ error: TASK_NOT_FOUND }, { status: 404 });
    }

    const body = await request.json();
    const input = parseTaskEvent(body);
    const event = await store.appendTaskEvent(taskId, input);
    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : UNKNOWN_ERROR;
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
