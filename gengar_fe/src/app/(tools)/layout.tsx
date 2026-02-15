import { Layout } from "@/components/layout";
import { ReactNode } from "react";

export default function ToolsLayout({ children }: { children: ReactNode }) {
  return <Layout>{children}</Layout>;
}