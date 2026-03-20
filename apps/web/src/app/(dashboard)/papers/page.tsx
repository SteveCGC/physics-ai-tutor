import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";

export default function PapersPage() {
  return (
    <PageContainer>
      <PageHeader title="试卷管理" description="管理草稿、已发布试卷与归档内容。" />
      <Card>
        <CardContent className="p-6 text-sm text-text-muted">
          试卷管理页面占位已建立。
        </CardContent>
      </Card>
    </PageContainer>
  );
}
