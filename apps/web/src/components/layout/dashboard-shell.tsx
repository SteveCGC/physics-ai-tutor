"use client";

import { ChevronDown, Settings } from "lucide-react";
import type { SidebarItem } from "@/components/layout/sidebar";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import type { UserProfile } from "@/lib/auth-session";

function initials(name?: string) {
  return name?.slice(0, 2).toUpperCase() ?? "AI";
}

export function DashboardShell({
  items,
  profile,
  children,
}: {
  items: SidebarItem[];
  profile: UserProfile | null;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-bg-page">
      <Sidebar items={items} profile={profile} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar
          user={
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" className="gap-3 px-3">
                  <Avatar className="size-9">
                    <AvatarImage src={profile?.avatar ?? undefined} alt={profile?.name ?? "用户头像"} />
                    <AvatarFallback>{initials(profile?.name)}</AvatarFallback>
                  </Avatar>
                  <div className="hidden text-left md:block">
                    <p className="text-sm font-medium text-text-strong">
                      {profile?.name ?? "用户"}
                    </p>
                    <p className="text-xs text-text-muted">
                      {profile?.role === "teacher" ? "教师" : "学生"}
                    </p>
                  </div>
                  <ChevronDown className="size-4 text-text-subtle" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>账户</DropdownMenuLabel>
                <DropdownMenuItem>
                  <Settings className="size-4" />
                  个人设置
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-danger focus:text-danger">
                  退出登录
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          }
        />
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
