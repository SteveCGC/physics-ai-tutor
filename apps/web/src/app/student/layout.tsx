"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
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

  return <DashboardShell items={studentItems} profile={profile}>{children}</DashboardShell>;
}
