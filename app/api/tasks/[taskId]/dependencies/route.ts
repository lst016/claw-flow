import { NextResponse } from "next/server";
import { store } from "@/lib/store";

const TASK_NOT_FOUND = "任务不存在。";
const UNKNOWN_ERROR = "未知错误";

type Params = {
  params: Promise<{ taskId: string }>;
};

export async function GET(_: Request, { params }: Params) {
  try {
    const { taskId } = await params;
    const dependencies = await store.getDependencies(taskId);

    if (!dependencies) {
      return NextResponse.json({ error: TASK_NOT_FOUND }, { status: 404 });
    }

    return NextResponse.json(dependencies);
  } catch (error) {
    const message = error instanceof Error ? error.message : UNKNOWN_ERROR;
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
