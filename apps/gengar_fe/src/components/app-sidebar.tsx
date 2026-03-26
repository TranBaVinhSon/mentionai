"use client";

import * as React from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import Link from "next/link";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="px-8 py-12">
        <h2 className="text-xl font-bold">MentionAI</h2>
      </SidebarHeader>
      <SidebarContent className="px-8">
        <nav className="space-y-6">
          <div>
            <h2 className="text-xl font-bold mb-4">Browse</h2>
          </div>

          <div>
            <h2 className="text-xl font-bold mb-4">Community</h2>
          </div>
        </nav>

        {/* Divider */}
        <div className="my-6 border-t border-border" />

        {/* Menu Links */}
        <div className="space-y-4">
          <Link
            href="/about"
            className="block text-base text-muted-foreground hover:text-brand transition-colors"
          >
            About
          </Link>
          <Link
            href="/faq"
            className="block text-base text-muted-foreground hover:text-brand transition-colors"
          >
            FAQ
          </Link>
          <Link
            href="/blog"
            className="block text-base text-muted-foreground hover:text-brand transition-colors"
          >
            Blog
          </Link>
          <Link
            href="/login"
            className="block text-base text-muted-foreground hover:text-brand transition-colors"
          >
            Log in
          </Link>
        </div>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}