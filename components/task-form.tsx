const text = {
  title: "新建任务",
  description: "先输入任务卡，再按 taskId 交换上下文。",
  write: "写入",
  taskTitle: "任务标题",
  taskTitlePlaceholder: "实现登录接口",
  summary: "摘要快照",
  summaryPlaceholder: "给 Root 保留的短摘要。",
  agent: "执行 Agent (根)",
  agentPlaceholder: "dev-assistant / main / creator",
  subagent: "子 Agent (可选)",
  subagentPlaceholder: "开发 / 测试 / 设计 (在 SubAgent 页面配置)",
  parentTask: "父任务",
  parentTaskPlaceholder: "留空则创建根任务",
  submit: "新建任务",
  submitting: "写入中...",
  reset: "清空",
} as const;

export type TaskFormValue = {
  title: string;
  summary: string;
  assignedAgent: string;
  subagent?: string;
  parentTaskId: string;
};

type TaskFormProps = {
  value: TaskFormValue;
  tasks: { taskId: string; title: string }[];
  saving: boolean;
  onChange: (value: TaskFormValue) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onReset: () => void;
};

export function TaskForm({ value, tasks, saving, onChange, onSubmit, onReset }: TaskFormProps) {
  // 过滤掉自己作为父任务，避免循环引用
  const availableParents = tasks.filter(t => t.taskId !== value.parentTaskId);

  return (
    <article className="panel">
      <div className="panel-inner">
        <div className="panel-header">
          <div>
            <h2>{text.title}</h2>
            <p>{text.description}</p>
          </div>
          <span className="pill">{text.write}</span>
        </div>

        <form className="stack" onSubmit={onSubmit}>
          <div className="row">
            <label htmlFor="title">{text.taskTitle}</label>
            <input
              id="title"
              className="field"
              value={value.title}
              onChange={(event) => onChange({ ...value, title: event.target.value })}
              placeholder={text.taskTitlePlaceholder}
              required
            />
          </div>

          <div className="row">
            <label htmlFor="summary">{text.summary}</label>
            <textarea
              id="summary"
              className="textarea"
              value={value.summary}
              onChange={(event) => onChange({ ...value, summary: event.target.value })}
              placeholder={text.summaryPlaceholder}
            />
          </div>

          <div className="row">
            <label htmlFor="assignedAgent">{text.agent}</label>
            <input
              id="assignedAgent"
              className="field"
              value={value.assignedAgent}
              onChange={(event) => onChange({ ...value, assignedAgent: event.target.value })}
              placeholder={text.agentPlaceholder}
            />
          </div>

          <div className="row">
            <label htmlFor="subagent">{text.subagent}</label>
            <input
              id="subagent"
              className="field"
              value={value.subagent || ""}
              onChange={(event) => onChange({ ...value, subagent: event.target.value })}
              placeholder={text.subagentPlaceholder}
            />
          </div>

          <div className="row">
            <label htmlFor="parentTaskId">{text.parentTask}</label>
            <select
              id="parentTaskId"
              className="select"
              value={value.parentTaskId}
              onChange={(event) => onChange({ ...value, parentTaskId: event.target.value })}
            >
              <option value="">{text.parentTaskPlaceholder}</option>
              {availableParents.map((task) => (
                <option key={task.taskId} value={task.taskId}>
                  {task.title} ({task.taskId.slice(0, 12)}...)
                </option>
              ))}
            </select>
          </div>

          <div className="actions">
            <button className="button" type="submit" disabled={saving}>
              {saving ? text.submitting : text.submit}
            </button>
            <button className="button secondary" type="button" disabled={saving} onClick={onReset}>
              {text.reset}
            </button>
          </div>
        </form>
      </div>
    </article>
  );
}
