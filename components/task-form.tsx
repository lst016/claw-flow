const text = {
  title: "\u65b0\u5efa\u4efb\u52a1",
  description: "\u5148\u5199\u5165\u4efb\u52a1\u5361\uff0c\u518d\u6309 taskId \u4ea4\u6362\u4e0a\u4e0b\u6587\u3002",
  write: "\u5199\u5165",
  taskTitle: "\u4efb\u52a1\u6807\u9898",
  taskTitlePlaceholder: "\u5b9e\u73b0\u767b\u5f55\u63a5\u53e3",
  summary: "\u6458\u8981\u5feb\u7167",
  summaryPlaceholder: "\u7ed9 Root \u4fdd\u7559\u7684\u77ed\u6458\u8981\u3002",
  agent: "\u6267\u884c Agent",
  submit: "\u65b0\u5efa\u4efb\u52a1",
  submitting: "\u5199\u5165\u4e2d...",
  reset: "\u6e05\u7a7a",
} as const;

type TaskFormValue = {
  title: string;
  summary: string;
  assignedAgent: string;
};

type TaskFormProps = {
  value: TaskFormValue;
  saving: boolean;
  onChange: (value: TaskFormValue) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onReset: () => void;
};

export function TaskForm({ value, saving, onChange, onSubmit, onReset }: TaskFormProps) {
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
              placeholder="backend-agent"
            />
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
