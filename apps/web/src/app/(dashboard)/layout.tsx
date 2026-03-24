"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { FileText, Home, Settings, Users } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import type { SidebarItem } from "@/components/layout/sidebar";
import { useAuth } from "@/lib/auth";

const teacherItems: SidebarItem[] = [
  { key: "home", label: "仪表盘", href: "/", icon: <Home /> },
  { key: "papers", label: "试卷管理", href: "/exams", icon: <FileText /> },
  { key: "students", label: "学生管理", href: "/students", icon: <Users /> },
  { key: "settings", label: "设置", href: "/settings", icon: <Settings /> },
];

export default function TeacherDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, isLoading, profile } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [isLoading, user, router]);

  if (isLoading || !user) {
    return null;
  }

  return <DashboardShell items={teacherItems} profile={profile}>{children}</DashboardShell>;
}
