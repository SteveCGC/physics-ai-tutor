import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "高中物理AI教学助手",
  description: "面向高中物理教师和学生的智能教学助手平台",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
