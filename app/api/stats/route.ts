import { NextResponse } from "next/server";
import { store } from "@/lib/store";
import { readFileSync, existsSync, readdirSync, statSync } from "fs";
import { join } from "path";
import type { TaskFilters, TaskStats, TokenUsageResponse, ModelUsageResponse, ModelUsageStats, TaskStatus } from "@/lib/types/task";

const UNKNOWN_ERROR = "未知错误";

async function fetchTokenUsage(): Promise<TokenUsageResponse | null> {
  try {
    // First try direct HTTP to gateway
    const result = await fetch("http://127.0.0.1:18789/api/usage/cost", {
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (result.ok) {
      const data = (await result.json()) as TokenUsageResponse;
      return data;
    }
  } catch {
    // Ignore and try CLI
  }

  try {
    // Fallback to CLI
    const { execSync } = await import("child_process");
    const output = execSync("openclaw gateway usage-cost --json", {
      encoding: "utf-8",
      timeout: 15000,
    });
    return JSON.parse(output) as TokenUsageResponse;
  } catch {
    return null;
  }
}

// Helper function to scan session logs for model usage (shared with /api/usage/by-model)
function getAgentsDir(): string {
  const homeDir = process.env.HOME || process.env.USERPROFILE || "";
  return join(homeDir, ".openclaw", "agents");
}

interface SessionLogEntry {
  type: string;
  modelId?: string;
  provider?: string;
  timestamp?: string;
  message?: {
    role?: string;
    usage?: {
      input_tokens?: number;
      output_tokens?: number;
    };
  };
  data?: {
    modelId?: string;
    provider?: string;
    usage?: {
      input_tokens?: number;
      output_tokens?: number;
    };
  };
}

function scanSessionLogs(agentsDir: string, days: number = 30): ModelUsageStats[] {
  const modelMap = new Map<string, ModelUsageStats>();
  const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000;

  if (!existsSync(agentsDir)) {
    return [];
  }

  const agentDirs = readdirSync(agentsDir).filter(name => {
    return statSync(join(agentsDir, name)).isDirectory();
  });

  for (const agentDir of agentDirs) {
    const sessionsDir = join(agentsDir, agentDir, "sessions");
    if (!existsSync(sessionsDir)) continue;

    const files = readdirSync(sessionsDir);
    
    for (const file of files) {
      if (!file.endsWith(".jsonl") || file.includes(".deleted.")) continue;
      
      const filePath = join(sessionsDir, file);
      const fileStat = statSync(filePath);
      
      // Skip files older than cutoff
      if (fileStat.mtimeMs < cutoffTime) continue;

      try {
        const content = readFileSync(filePath, "utf-8");
        const lines = content.split("\n").filter(line => line.trim());

        let currentModel = "unknown";
        let currentProvider = "unknown";

        for (const line of lines) {
          try {
            const entry = JSON.parse(line) as SessionLogEntry;
            
            // Track model changes
            if (entry.type === "model_change") {
              currentModel = entry.modelId || "unknown";
              currentProvider = entry.provider || "unknown";
              
              // Initialize model stats if not exists
              const modelKey = `${currentProvider}/${currentModel}`;
              if (!modelMap.has(modelKey)) {
                modelMap.set(modelKey, {
                  modelId: currentModel,
                  provider: currentProvider,
                  sessionCount: 0,
                  messageCount: 0,
                  inputTokens: 0,
                  outputTokens: 0,
                  totalTokens: 0,
                  totalCost: 0,
                });
              }
              modelMap.get(modelKey)!.sessionCount++;
            }
            
            // Track messages and their usage
            if (entry.type === "message" && entry.message?.role === "assistant") {
              const modelKey = `${currentProvider}/${currentModel}`;
              if (modelMap.has(modelKey)) {
                const stats = modelMap.get(modelKey)!;
                stats.messageCount++;
                
                // Extract usage if available
                if (entry.message.usage) {
                  // Session log uses "input"/"output" not "input_tokens"/"output_tokens"
                  const input = (entry.message.usage as { input?: number; input_tokens?: number }).input || entry.message.usage.input_tokens || 0;
                  const output = (entry.message.usage as { output?: number; output_tokens?: number }).output || entry.message.usage.output_tokens || 0;
                  stats.inputTokens += input;
                  stats.outputTokens += output;
                  stats.totalTokens += input + output;
                }
              }
            }
            
            // Check custom type for model-snapshot which may contain usage
            if (entry.type === "custom" && entry.data) {
              if (entry.data.modelId) currentModel = entry.data.modelId;
              if (entry.data.provider) currentProvider = entry.data.provider;
              
              const modelKey = `${currentProvider}/${currentModel}`;
              if (!modelMap.has(modelKey) && currentModel !== "unknown") {
                modelMap.set(modelKey, {
                  modelId: currentModel,
                  provider: currentProvider,
                  sessionCount: 0,
                  messageCount: 0,
                  inputTokens: 0,
                  outputTokens: 0,
                  totalTokens: 0,
                  totalCost: 0,
                });
              }
              
              // Extract usage from model-snapshot data
              if (entry.data.usage) {
                const modelKey = `${currentProvider}/${currentModel}`;
                if (modelMap.has(modelKey)) {
                  const stats = modelMap.get(modelKey)!;
                  // Session log uses "input"/"output" not "input_tokens"/"output_tokens"
                  const input = (entry.data.usage as { input?: number; input_tokens?: number }).input || entry.data.usage.input_tokens || 0;
                  const output = (entry.data.usage as { output?: number; output_tokens?: number }).output || entry.data.usage.output_tokens || 0;
                  stats.inputTokens += input;
                  stats.outputTokens += output;
                  stats.totalTokens += input + output;
                }
              }
            }
          } catch {
            // Skip malformed lines
          }
        }
      } catch {
        // Skip unreadable files
      }
    }
  }

  return Array.from(modelMap.values());
}

async function fetchModelUsage(): Promise<ModelUsageResponse | null> {
  try {
    const agentsDir = getAgentsDir();
    const models = scanSessionLogs(agentsDir, 30);
    
    // Calculate totals
    const totals = {
      sessionCount: 0,
      messageCount: 0,
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      totalCost: 0,
    };

    for (const model of models) {
      totals.sessionCount += model.sessionCount;
      totals.messageCount += model.messageCount;
      totals.inputTokens += model.inputTokens;
      totals.outputTokens += model.outputTokens;
      totals.totalTokens += model.totalTokens;
      totals.totalCost += model.totalCost;
    }

    return {
      updatedAt: Date.now(),
      models: models.sort((a, b) => b.totalTokens - a.totalTokens),
      totals,
    };
  } catch (error) {
    console.error("Error fetching model usage:", error);
    return null;
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse filter parameters
    const statusParam = searchParams.get("status");
    const agent = searchParams.get("agent") || undefined;
    const from = searchParams.get("from") || undefined;
    const to = searchParams.get("to") || undefined;
    const search = searchParams.get("search") || undefined;
    const tagsParam = searchParams.get("tags");
    const parentTaskId = searchParams.get("parentTaskId") || undefined;
    const includeTokens = searchParams.get("includeTokens") !== "false";
    const includeModels = searchParams.get("includeModels") !== "false";

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

    const stats = (await store.getStats(filters)) as TaskStats;
    
    // Fetch token usage if requested
    if (includeTokens) {
      const tokenUsage = await fetchTokenUsage();
      if (tokenUsage) {
        stats.tokenUsage = tokenUsage;
      }
    }
    
    // Fetch model usage if requested
    if (includeModels) {
      const modelUsage = await fetchModelUsage();
      if (modelUsage && modelUsage.models.length > 0) {
        stats.modelUsage = modelUsage;
      }
    }
    
    return NextResponse.json(stats);
  } catch (error) {
    const message = error instanceof Error ? error.message : UNKNOWN_ERROR;
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
