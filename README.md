# 🦞 ClawFlow - 任务分发与子代理管理平台

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-15-blue?style=for-the-badge&logo=next.js" alt="Next.js">
  <img src="https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/Docker-3-blue?style=for-the-badge&logo=docker" alt="Docker">
</p>

> 面向 OpenClaw 的智能任务分发与子代理管理平台，让 AI Agent 协作更高效。

## ✨ 特性

- 🔄 **智能任务分发** - 自动将任务分发给合适的子代理，支持多种分发策略
- 🤖 **子代理管理** - 集中管理、配置和监控所有子代理
- 📊 **可视化看板** - 任务状态一目了然，拖拽式操作
- 🔒 **上下文隔离** - 避免子代理上下文污染，保持主代理清晰
- 📝 **完整日志** - 任务全生命周期记录，支持Artifact存储
- ⏰ **自动清理** - 默认7天自动过期，减少存储压力
- 🐳 **Docker 部署** - 一键部署，开箱即用

## 🚀 快速开始

### Docker 部署（推荐）

```bash
# 拉取镜像
docker pull claw-flow

# 运行容器
docker run -d -p 3333:3333 -e REDIS_URL=host.docker.internal:6379 --name claw-flow claw-flow
```

打开 [http://localhost:3333](http://localhost:3333)

### 本地开发

```bash
# 克隆项目
git clone https://github.com/lst016/claw-flow.git
cd claw-flow

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

打开 [http://localhost:3333](http://localhost:3333)

## 📖 使用指南

### 创建任务

```bash
curl -X POST http://localhost:3333/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "实现用户登录功能",
    "summary": "需要实现JWT认证",
    "assignedAgent": "developer",
    "subagent": "开发",
    "tags": ["backend", "auth"]
  }'
```

### 子代理获取任务

```bash
# 获取完整任务上下文
curl "http://localhost:3333/api/tasks/{taskId}/context?actor=开发"
```

### 更新任务状态

```bash
curl -X PATCH http://localhost:3333/api/tasks/{taskId} \
  -H "Content-Type: application/json" \
  -d '{"status": "completed", "summary": "已完成"}'
```

## 🏗️ 架构

```
┌─────────────────────────────────────────────────────┐
│                    ClawFlow                         │
├─────────────────────────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐  ┌──────────────────┐   │
│  │  看板   │  │  列表   │  │     Agent        │   │
│  └────┬────┘  └────┬────┘  └────────┬────────┘   │
│       │             │                 │             │
│       └─────────────┴─────────────────┘             │
│                     │                               │
│              ┌──────┴──────┐                        │
│              │  任务分发器  │  (每20秒轮询)          │
│              └──────┬──────┘                        │
│                     │                               │
│       ┌─────────────┴─────────────┐                 │
│       ▼                             ▼               │
│  ┌─────────────┐           ┌─────────────┐        │
│  │  SubAgent 1 │           │  SubAgent 2  │        │
│  └─────────────┘           └─────────────┘        │
│                     │                               │
│                     ▼                               │
│              ┌─────────────┐                        │
│              │    Redis    │  (可选)                │
│              └─────────────┘                        │
└─────────────────────────────────────────────────────┘
```

## ⚙️ 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | 3333 | 服务端口 |
| `REDIS_URL` | - | Redis 连接地址（可选） |
| `CACHE_TTL_DAYS` | 7 | 数据保留天数 |

## 📦 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/tasks | 获取任务列表 |
| POST | /api/tasks | 创建任务 |
| GET | /api/tasks/:taskId | 获取任务详情 |
| PATCH | /api/tasks/:taskId | 更新任务 |
| POST | /api/tasks/:taskId/claim | 领取任务 |
| GET | /api/tasks/:taskId/context | 获取任务上下文 |
| GET | /api/subagents | 获取子代理列表 |
| POST | /api/subagents | 创建子代理 |

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License
