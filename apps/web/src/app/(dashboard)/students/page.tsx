import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";

export default function StudentsPage() {
  return (
    <PageContainer>
      <PageHeader title="学生管理" description="查看学生名单、班级归属和作业完成情况。" />
      <Card>
        <CardContent className="p-6 text-sm text-text-muted">
          学生管理页面占位已建立。
        </CardContent>
      </Card>
    </PageContainer>
  );
}
