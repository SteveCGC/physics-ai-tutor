import { Bell, Search, Settings } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TopbarProps {
  search?: React.ReactNode;
  context?: React.ReactNode;
  actions?: React.ReactNode;
  user?: React.ReactNode;
  className?: string;
}

export function Topbar({
  search,
  context,
  actions,
  user,
  className,
}: TopbarProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-[var(--color-border)] bg-white/80 px-8 backdrop-blur-md",
        className
      )}
    >
      <div className="w-full max-w-[360px]">
        {search ?? <Input leadingIcon={<Search />} placeholder="搜索试卷、班级或学生" />}
      </div>
      <div className="hidden flex-1 justify-center md:flex">
        {context ?? (
          <p className="text-sm font-medium text-text-muted">2026 春季学期 · 高二物理备课周</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        {actions ?? (
          <>
            <Button variant="ghost" size="icon" aria-label="通知">
              <Bell className="size-5" />
            </Button>
            <Button variant="ghost" size="icon" aria-label="设置">
              <Settings className="size-5" />
            </Button>
          </>
        )}
        {user}
      </div>
    </header>
  );
}
