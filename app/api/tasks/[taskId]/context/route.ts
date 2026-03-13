import { NextResponse } from "next/server";
import { store } from "@/lib/store";

const TASK_NOT_FOUND = "\u4efb\u52a1\u4e0d\u5b58\u5728\u3002";

type Params = {
  params: Promise<{ taskId: string }>;
};

export async function GET(request: Request, { params }: Params) {
  const { taskId } = await params;
  const actor = new URL(request.url).searchParams.get("actor") ?? "root";
  const bundle = await store.getContextBundle(taskId, actor);

  if (!bundle) {
    return NextResponse.json({ error: TASK_NOT_FOUND }, { status: 404 });
  }

  await store.appendTaskEvent(taskId, {
    type: "context_read",
    actor,
    message: `\u5df2\u4e3a ${actor} \u751f\u6210\u4e0a\u4e0b\u6587\u5305\u3002`,
    metadata: {
      access: bundle.guidance.access,
      inputCount: bundle.inputArtifacts.length,
      outputCount: bundle.outputArtifacts.length,
    },
  });

  return NextResponse.json({ context: bundle, actor });
}
