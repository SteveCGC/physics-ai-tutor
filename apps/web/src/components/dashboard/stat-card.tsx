import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
  label: string;
  value: number;
  icon: ReactNode;
  accentClassName?: string;
}

export function StatCard({ label, value, icon, accentClassName }: StatCardProps) {
  return (
    <Card className="border-transparent bg-bg-card shadow-[var(--shadow-sm)]">
      <CardContent className="flex items-start justify-between p-6">
        <div className="space-y-2">
          <p className="text-sm text-text-muted">{label}</p>
          <p className="text-3xl font-bold text-text-strong">{value}</p>
        </div>
        <div
          className={[
            "flex size-12 items-center justify-center rounded-2xl bg-bg-elevated",
            accentClassName,
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}
