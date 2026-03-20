import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";

export default function AIGeneratePage() {
  return (
    <PageContainer>
      <PageHeader title="AI 出题" description="按班级、题型和知识点生成课堂练习。" />
      <Card>
        <CardContent className="p-6 text-sm text-text-muted">
          AI 出题页面入口已接入侧边栏。
        </CardContent>
      </Card>
    </PageContainer>
  );
}
