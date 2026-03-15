import { NextResponse } from "next/server";
import { store } from "@/lib/store";
import type { TaskRecord } from "@/lib/types/task";

const UNKNOWN_ERROR = "未知错误";

type TaskTreeNode = {
  task: TaskRecord;
  children: TaskTreeNode[];
};

function buildTaskTree(tasks: TaskRecord[]): TaskTreeNode[] {
  const taskMap = new Map<string, TaskTreeNode>();
  const rootNodes: TaskTreeNode[] = [];

  // First pass: create nodes for all tasks
  for (const task of tasks) {
    taskMap.set(task.taskId, { task, children: [] });
  }

  // Second pass: build tree relationships
  for (const task of tasks) {
    const node = taskMap.get(task.taskId)!;
    
    if (task.parentTaskId) {
      // Has parent: add to parent's children
      const parentNode = taskMap.get(task.parentTaskId);
      if (parentNode) {
        parentNode.children.push(node);
      } else {
        // Parent not found, treat as root
        rootNodes.push(node);
      }
    } else {
      // No parent: treat as root
      rootNodes.push(node);
    }
  }

  return rootNodes;
}

export async function GET() {
  try {
    const tasks = await store.listTasks();
    
    if (!tasks || tasks.length === 0) {
      return NextResponse.json({ tree: [], total: 0 });
    }

    const tree = buildTaskTree(tasks);

    return NextResponse.json({ 
      tree, 
      total: tasks.length 
    });
  } catch (error) {
    console.error("Error building task tree:", error);
    const message = error instanceof Error ? error.message : UNKNOWN_ERROR;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
