import { Layout } from "@/components/layout";
import { ReactNode } from "react";

export default async function MainLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <Layout>{children}</Layout>;
}
