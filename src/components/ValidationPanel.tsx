import { AlertCircle, Check } from "lucide-react";

import type { ValidationIssue } from "../types";

export function ValidationPanel({ issues }: { issues: ValidationIssue[] }) {
  if (!issues.length) {
    return (
      <div className="status ok">
        <Check size={16} />
        JSON passes the editor checks
      </div>
    );
  }

  return (
    <div className="validation">
      <div className="validation-title">
        <AlertCircle size={16} />
        {issues.length} validation {issues.length === 1 ? "issue" : "issues"}
      </div>
      <div className="issue-list">
        {issues.map((issue) => (
          <div className={`issue ${issue.level}`} key={issue.id}>
            <strong>{issue.path}</strong>
            <span>{issue.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
