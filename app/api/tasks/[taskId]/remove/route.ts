import { NextResponse } from "next/server";
import { store } from "@/lib/store";

const TASK_NOT_FOUND = "任务不存在。";

type Params = {
  params: Promise<{ taskId: string }>;
};

export async function POST(_: Request, { params }: Params) {
  const { taskId } = await params;
  const task = await store.getTask(taskId);

  if (!task) {
    return NextResponse.json({ error: TASK_NOT_FOUND }, { status: 404 });
  }

  await store.deleteTask(taskId);
  return NextResponse.json({ success: true });
}
