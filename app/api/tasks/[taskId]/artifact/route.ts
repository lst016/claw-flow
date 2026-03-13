import { NextResponse } from "next/server";
import { store } from "@/lib/store";
import { parseArtifact } from "@/lib/validators/task";

const TASK_NOT_FOUND = "\u4efb\u52a1\u4e0d\u5b58\u5728\u3002";
const UNKNOWN_ERROR = "\u672a\u77e5\u9519\u8bef";

type Params = {
  params: Promise<{ taskId: string }>;
};

export async function POST(request: Request, { params }: Params) {
  try {
    const { taskId } = await params;
    const body = await request.json();
    const input = parseArtifact(body);
    const artifact = await store.saveArtifact(taskId, input);
    const task = await store.getTask(taskId);

    await store.appendTaskEvent(taskId, {
      type: "artifact_saved",
      actor: input.sourceAgent ?? "worker",
      message: `\u5df2\u5199\u5165\u8be6\u7ec6\u5185\u5bb9\uff1a${artifact.type}`,
      metadata: {
        artifactId: artifact.artifactId,
        artifactType: artifact.type,
        tags: artifact.tags,
      },
    });

    return NextResponse.json({ task, artifact }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : UNKNOWN_ERROR;
    const isMissingTask = message === "Task not found" || message === TASK_NOT_FOUND;
    return NextResponse.json({ error: isMissingTask ? TASK_NOT_FOUND : message }, { status: isMissingTask ? 404 : 400 });
  }
}
