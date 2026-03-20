"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { signOut } from "@/lib/auth";
import type { UserProfile } from "@/lib/auth-session";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type SidebarItem = {
  key: string;
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string;
};

interface SidebarProps {
  items: SidebarItem[];
  profile: UserProfile | null;
}

function getInitials(name?: string) {
  if (!name) {
    return "AI";
  }

  return name.slice(0, 2).toUpperCase();
}

export function Sidebar({ items, profile }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-border bg-bg-card">
      <div className="flex h-20 items-center gap-3 border-b border-border px-6">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-primary-soft text-primary shadow-sm">
          <span className="text-lg font-bold">Φ</span>
        </div>
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary">
            Physics AI
          </p>
          <p className="text-base font-semibold text-text-strong">Tutor</p>
        </div>
      </div>

      <nav className="flex-1 space-y-2 px-4 py-6">
        {items.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.key}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors",
                active
                  ? "bg-[var(--color-primary)] text-white"
                  : "text-text-muted hover:bg-primary-soft hover:text-primary"
              )}
            >
              <span className="[&_svg]:size-6">{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {item.badge ? (
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs",
                    active ? "bg-white/15 text-white" : "bg-bg-elevated text-primary"
                  )}
                >
                  {item.badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-4">
        <div className="rounded-[16px] border border-border bg-bg-elevated p-4">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={profile?.avatar ?? undefined} alt={profile?.name ?? "用户头像"} />
              <AvatarFallback>{getInitials(profile?.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-text-strong">
                {profile?.name ?? "未登录用户"}
              </p>
              <p className="text-sm text-text-muted">
                {profile?.role === "teacher" ? "教师" : profile?.role === "student" ? "学生" : "访客"}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            className="mt-4 w-full justify-start"
            onClick={() => void signOut(router)}
          >
            <LogOut className="size-4" />
            登出
          </Button>
        </div>
      </div>
    </aside>
  );
}
