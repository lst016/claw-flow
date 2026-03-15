import { NextResponse } from "next/server";
import { readFileSync, existsSync, readdirSync, statSync } from "fs";
import { join } from "path";
import type { ModelUsageResponse, ModelUsageStats } from "@/lib/types/task";

const UNKNOWN_ERROR = "获取模型统计失败";

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

function getAgentsDir(): string {
  const homeDir = process.env.HOME || process.env.USERPROFILE || "";
  return join(homeDir, ".openclaw", "agents");
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
                  const input = entry.message.usage.input_tokens || 0;
                  const output = entry.message.usage.output_tokens || 0;
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
                  const input = entry.data.usage.input_tokens || 0;
                  const output = entry.data.usage.output_tokens || 0;
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

export async function GET() {
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

    const response: ModelUsageResponse = {
      updatedAt: Date.now(),
      models: models.sort((a, b) => b.totalTokens - a.totalTokens),
      totals,
    };

    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : UNKNOWN_ERROR;
    console.error("Model usage fetch error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
