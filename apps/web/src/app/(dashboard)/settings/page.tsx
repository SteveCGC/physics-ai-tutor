import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <PageContainer>
      <PageHeader title="设置" description="配置账号、偏好与基础教学信息。" />
      <Card>
        <CardContent className="p-6 text-sm text-text-muted">
          设置页面占位已建立。
        </CardContent>
      </Card>
    </PageContainer>
  );
}
