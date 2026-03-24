import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "高中物理AI教学助手",
  description: "面向高中物理教师和学生的智能教学助手平台",
  icons: {
    icon: "/icon.svg",
    apple: "/Gemini_Icon2.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-bg-page text-text-default">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
