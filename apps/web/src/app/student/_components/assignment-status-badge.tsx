"use client";

import { Badge } from "@/components/ui/badge";
import type { StudentAssignmentStatus } from "../_lib/student-format";

export function AssignmentStatusBadge({ status }: { status: StudentAssignmentStatus }) {
  if (status === "published") {
    return <Badge variant="success">成绩已发布</Badge>;
  }

  if (status === "pending_review") {
    return <Badge variant="warning">已提交待批改</Badge>;
  }

  if (status === "submitted") {
    return <Badge variant="warning">已提交待批改</Badge>;
  }

  if (status === "in_progress") {
    return <Badge variant="info">进行中</Badge>;
  }

  return (
    <Badge variant="knowledge" className="bg-bg-elevated text-text-muted">
      未开始
    </Badge>
  );
}
