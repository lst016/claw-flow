import { NextResponse } from "next/server";
import { store } from "@/lib/store";
import { parseCreateTask } from "@/lib/validators/task";
import type { TaskFilters, TaskStatus } from "@/lib/types/task";

const UNKNOWN_ERROR = "未知错误";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  // Parse filter parameters
  const statusParam = searchParams.get("status");
  const agent = searchParams.get("agent") || undefined;
  const from = searchParams.get("from") || undefined;
  const to = searchParams.get("to") || undefined;
  const search = searchParams.get("search") || undefined;
  const tagsParam = searchParams.get("tags");
  const parentTaskId = searchParams.get("parentTaskId") || undefined;
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");

  // Parse status array
  let status: TaskStatus[] | undefined;
  if (statusParam) {
    status = statusParam.split(",") as TaskStatus[];
  }

  // Parse tags array
  let tags: string[] | undefined;
  if (tagsParam) {
    tags = tagsParam.split(",");
  }

  const filters: TaskFilters = {
    status,
    agent,
    from,
    to,
    search,
    tags,
    parentTaskId,
  };

  // Check if filtering is needed
  const hasFilters = status || agent || from || to || search || (tags && tags.length > 0) || parentTaskId;

  if (hasFilters) {
    const result = await store.listTasksWithFilters({ filters, page, limit });
    return NextResponse.json(result);
  }

  // No filters, return all tasks (legacy behavior)
  const tasks = await store.listTasks();
  return NextResponse.json({ 
    tasks, 
    total: tasks.length, 
    page: 1, 
    limit: tasks.length,
    filters: {} 
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = parseCreateTask(body);
    
    // Pass dependsOnTaskIds to createTask
    const task = await store.createTask({
      ...input,
      dependsOnTaskIds: body.dependsOnTaskIds,
    });

    // Event is now auto-created in store layer
    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : UNKNOWN_ERROR;
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
