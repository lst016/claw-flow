import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Claw 记忆插件",
  description: "一个面向 Root / Claw 工作流的轻量任务与记忆插件。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
