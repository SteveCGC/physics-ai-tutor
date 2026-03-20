"use client";

import { FileText, Home, Plus, Settings, Users } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import type { SidebarItem } from "@/components/layout/sidebar";
import { useAuth } from "@/lib/auth";

const teacherItems: SidebarItem[] = [
  { key: "home", label: "仪表盘", href: "/", icon: <Home /> },
  { key: "ai-generate", label: "AI 出题", href: "/exams/new", icon: <Plus /> },
  { key: "papers", label: "试卷管理", href: "/exams", icon: <FileText /> },
  { key: "students", label: "学生管理", href: "/students", icon: <Users /> },
  { key: "settings", label: "设置", href: "/settings", icon: <Settings /> },
];

export default function TeacherDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = useAuth();
  return <DashboardShell items={teacherItems} profile={profile}>{children}</DashboardShell>;
}
