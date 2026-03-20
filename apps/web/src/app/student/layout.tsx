"use client";

import { BarChart3, BookOpen } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import type { SidebarItem } from "@/components/layout/sidebar";
import { useAuth } from "@/lib/auth";

const studentItems: SidebarItem[] = [
  { key: "homework", label: "我的作业", href: "/student/assignments", icon: <BookOpen /> },
  { key: "grades", label: "成绩查看", href: "/student/results", icon: <BarChart3 /> },
];

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = useAuth();
  return <DashboardShell items={studentItems} profile={profile}>{children}</DashboardShell>;
}
